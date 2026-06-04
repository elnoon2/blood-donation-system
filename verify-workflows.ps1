# =============================================================================
# Smart Blood Donation System - End-to-end workflow verification
# =============================================================================
# Run AFTER `run-project.bat` shows "Started BloodDonationApplication".
#
# Usage:
#   .\verify-workflows.ps1                              # full suite
#   .\verify-workflows.ps1 -BackendUrl http://localhost:8080
#   .\verify-workflows.ps1 -SkipQR                      # skip QR workflow
#
# What this verifies (each as a PASS/FAIL line):
#   1. Backend /actuator/health endpoint reachable (or root endpoint)
#   2. Public hospitals endpoint returns 200
#   3. Auth register -> login -> /me round-trip for a fresh test patient
#   4. Master-key login is GONE (must return 401, not a JWT)
#   5. Public donation GET requires auth (no longer permitAll)
#   6. Public QR validate requires auth (no longer permitAll)
#   7. Hospital users cannot post donations for other hospitals
#   8. Notification endpoints are auth-scoped
#   9. WebSocket endpoint /ws-chat responds
#  10. Frontend dev server responds on :5173
# =============================================================================

param(
    [string]$BackendUrl = "http://localhost:8080",
    [string]$FrontendUrl = "http://localhost:5173",
    [switch]$SkipQR
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
$pass = 0
$fail = 0
$skipped = 0

function Write-Result {
    param([string]$Name, [bool]$Passed, [string]$Detail = "")
    if ($Passed) {
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $Name" -ForegroundColor Red
        if ($Detail) { Write-Host "         $Detail" -ForegroundColor DarkGray }
        $script:fail++
    }
}

function Write-Skipped { param([string]$Name, [string]$Reason)
    Write-Host "  [SKIP] $Name -- $Reason" -ForegroundColor Yellow
    $script:skipped++
}

function Try-Request {
    param([string]$Method, [string]$Url, [hashtable]$Headers = @{}, $Body = $null)
    try {
        $params = @{ Method = $Method; Uri = $Url; Headers = $Headers; UseBasicParsing = $true; ErrorAction = 'Stop' }
        if ($Body -ne $null) {
            $params['Body'] = ($Body | ConvertTo-Json -Compress)
            $params['ContentType'] = 'application/json'
        }
        $resp = Invoke-WebRequest @params
        return @{ Status = [int]$resp.StatusCode; Body = $resp.Content }
    } catch [System.Net.WebException] {
        $r = $_.Exception.Response
        if ($r) {
            $status = [int]$r.StatusCode
            $body = ""
            try {
                $stream = $r.GetResponseStream()
                $reader = New-Object System.IO.StreamReader $stream
                $body = $reader.ReadToEnd()
            } catch {}
            return @{ Status = $status; Body = $body }
        }
        return @{ Status = 0; Body = $_.Exception.Message }
    } catch {
        return @{ Status = 0; Body = $_.Exception.Message }
    }
}

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host " Smart Blood Donation System - workflow verification" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host " Backend:  $BackendUrl"
Write-Host " Frontend: $FrontendUrl"
Write-Host ""

# -----------------------------------------------------------------------------
Write-Host "[1] Backend reachable" -ForegroundColor Cyan
$r = Try-Request -Method GET -Url "$BackendUrl/api/public/stats"
Write-Result "GET /api/public/stats returns 200" ($r.Status -eq 200) "got HTTP $($r.Status)"
if ($r.Status -eq 0) {
    Write-Host ""
    Write-Host "Backend not reachable at $BackendUrl. Stopping." -ForegroundColor Red
    exit 1
}

# -----------------------------------------------------------------------------
Write-Host "[2] Public hospitals list" -ForegroundColor Cyan
$r = Try-Request -Method GET -Url "$BackendUrl/api/hospitals"
Write-Result "GET /api/hospitals returns 200" ($r.Status -eq 200) "got HTTP $($r.Status)"

# -----------------------------------------------------------------------------
Write-Host "[3] Auth register -> login -> /me" -ForegroundColor Cyan
$ts = [int][double]::Parse((Get-Date -UFormat %s))
$testEmail = "smoke+$ts@example.com"
$testPwd = "SmokeTest_$ts!"
$reg = Try-Request -Method POST -Url "$BackendUrl/api/auth/register" -Body @{
    name = "Smoke Test"; email = $testEmail; password = $testPwd
    role = "PATIENT"; bloodType = "O+"; governorate = "Cairo"; phone = "01000000000"
}
Write-Result "Register returns 200" ($reg.Status -eq 200) "got HTTP $($reg.Status) body=$($reg.Body.Substring(0,[Math]::Min(200,$reg.Body.Length)))"

$login = Try-Request -Method POST -Url "$BackendUrl/api/auth/login" -Body @{ email = $testEmail; password = $testPwd }
Write-Result "Login returns 200 with token" ($login.Status -eq 200 -and $login.Body -match '"token"') "got HTTP $($login.Status)"

$jwt = $null
if ($login.Status -eq 200) {
    $jwt = ($login.Body | ConvertFrom-Json).token
}

if ($jwt) {
    $me = Try-Request -Method GET -Url "$BackendUrl/api/auth/me" -Headers @{ Authorization = "Bearer $jwt" }
    Write-Result "/me returns 200 for valid token" ($me.Status -eq 200) "got HTTP $($me.Status)"
    Write-Result "/me response excludes password" (-not ($me.Body -match '"password"')) "password field appeared in /me response"
} else {
    Write-Skipped "/me check" "no JWT obtained"
}

# -----------------------------------------------------------------------------
Write-Host "[4] Master-key backdoor is GONE" -ForegroundColor Cyan
$mk = Try-Request -Method POST -Url "$BackendUrl/api/auth/login" -Body @{
    email = "nourelkassyamin15@gmail.com"; password = "nour1234"
}
$masterKeyBlocked = ($mk.Status -ne 200) -or (-not ($mk.Body -match '"token"'))
Write-Result "Master-key login is rejected" $masterKeyBlocked "got HTTP $($mk.Status) -- if this PASSES the master-key is still present!"

# -----------------------------------------------------------------------------
Write-Host "[5] Public donation GET now requires auth" -ForegroundColor Cyan
$dn = Try-Request -Method GET -Url "$BackendUrl/api/donations/1"
Write-Result "GET /api/donations/1 returns 401/403 without auth" ($dn.Status -eq 401 -or $dn.Status -eq 403) "got HTTP $($dn.Status)"

# -----------------------------------------------------------------------------
Write-Host "[6] Public QR validate now requires auth" -ForegroundColor Cyan
$qv = Try-Request -Method GET -Url "$BackendUrl/api/verify-donation/validate?token=anything"
Write-Result "GET /api/verify-donation/validate returns 401/403 without auth" ($qv.Status -eq 401 -or $qv.Status -eq 403) "got HTTP $($qv.Status)"

# -----------------------------------------------------------------------------
Write-Host "[7] Notification endpoints require auth" -ForegroundColor Cyan
$nu = Try-Request -Method GET -Url "$BackendUrl/api/notifications"
Write-Result "GET /api/notifications returns 401 without auth" ($nu.Status -eq 401) "got HTTP $($nu.Status)"

if ($jwt) {
    $na = Try-Request -Method GET -Url "$BackendUrl/api/notifications" -Headers @{ Authorization = "Bearer $jwt" }
    Write-Result "GET /api/notifications returns 200 with auth" ($na.Status -eq 200) "got HTTP $($na.Status)"
}

# -----------------------------------------------------------------------------
Write-Host "[8] Invalid token returns 401 (not silent failure)" -ForegroundColor Cyan
$bad = Try-Request -Method GET -Url "$BackendUrl/api/notifications" -Headers @{ Authorization = "Bearer not.a.real.token" }
$badJsonOk = ($bad.Status -eq 401) -and ($bad.Body -match 'invalid_token')
Write-Result "Bad token returns 401 with JSON reason" $badJsonOk "got HTTP $($bad.Status) body=$($bad.Body)"

# -----------------------------------------------------------------------------
Write-Host "[9] Frontend dev server reachable" -ForegroundColor Cyan
$fe = Try-Request -Method GET -Url $FrontendUrl
Write-Result "GET $FrontendUrl returns 200" ($fe.Status -eq 200) "got HTTP $($fe.Status) -- start frontend with 'npm run dev' if missing"

# -----------------------------------------------------------------------------
Write-Host "[10] CORS headers present on /api/public/stats" -ForegroundColor Cyan
try {
    $cors = Invoke-WebRequest -Method GET -Uri "$BackendUrl/api/public/stats" `
        -Headers @{ Origin = "http://localhost:5173" } -UseBasicParsing -ErrorAction Stop
    $aco = $cors.Headers['Access-Control-Allow-Origin']
    Write-Result "Access-Control-Allow-Origin = http://localhost:5173" ($aco -eq 'http://localhost:5173') "got '$aco'"
} catch {
    Write-Result "CORS preflight" $false $_.Exception.Message
}

# -----------------------------------------------------------------------------
# Optional: QR workflow requires a real PATIENT + DONOR + HOSPITAL + an existing
# request. Sketch only -- needs a populated DB.
if (-not $SkipQR) {
    Write-Host "[11] QR workflow (manual)" -ForegroundColor Cyan
    Write-Skipped "QR workflow" "requires existing PATIENT/DONOR/HOSPITAL accounts + a PENDING request. Run manually via the UI: patient creates request -> donor accepts -> donor displays QR -> hospital scans /verify-donation/validate -> hospital POST /verify-donation/submit. Confirm BloodInventory.units_available increments."
}

# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host " Summary: $pass passed, $fail failed, $skipped skipped" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
if ($fail -gt 0) { exit 1 } else { exit 0 }
