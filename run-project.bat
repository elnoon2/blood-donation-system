@echo off
TITLE Smart Blood Donation System - Starter
COLOR 0A
setlocal EnableDelayedExpansion

REM ----------------------------------------------------------------------
REM Pre-flight checks added by Phase 8 RCA fix (audit/08-rca-ora-01017.md).
REM Catch the ORA-01017 trap before launching anything by detecting whether
REM the local override file exists. Without it the backend would substitute
REM the CHANGE_ME placeholder password and Oracle would reject the login.
REM ----------------------------------------------------------------------
set LOCAL_CONFIG=backend-spring\src\main\resources\application-local.properties
set EXAMPLE_CONFIG=backend-spring\src\main\resources\application-local.properties.example

if not exist "%LOCAL_CONFIG%" (
    if "%DB_PASSWORD%"=="" (
        echo.
        echo =======================================================
        echo  WARNING: NO LOCAL DB CONFIG DETECTED
        echo =======================================================
        echo.
        echo Neither application-local.properties exists, nor is DB_PASSWORD
        echo set as an environment variable. The backend will fail with
        echo ORA-01017 ^(invalid username/password^).
        echo.
        echo Quick fix ^(choose one^):
        echo.
        echo   1. Copy the template file:
        echo        copy "%EXAMPLE_CONFIG%" "%LOCAL_CONFIG%"
        echo      Then edit "%LOCAL_CONFIG%" and set
        echo      spring.datasource.password to your local Oracle password.
        echo.
        echo   2. Or set env vars inline before re-running:
        echo        set DB_PASSWORD=your_oracle_password
        echo        set JWT_SECRET=64-byte-minimum-secret-here
        echo        run-project.bat
        echo.
        echo Aborting. See audit/08-rca-ora-01017.md for details.
        echo.
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object {$_.IPAddress -notlike ''169.254*'' -and $_.IPAddress -ne ''127.0.0.1''} ^| Select-Object -First 1 -ExpandProperty IPAddress)"') do set LOCAL_IP=%%i
if "%LOCAL_IP%"=="" set LOCAL_IP=localhost

set FRONTEND_LOCAL=http://localhost:5173
set FRONTEND_PHONE=http://%LOCAL_IP%:5173
set BACKEND_LOCAL=http://localhost:8080
set BACKEND_PHONE=http://%LOCAL_IP%:8080
set API_FOR_FRONTEND=http://%LOCAL_IP%:8080/api
REM Phase 13.2: VITE_PUBLIC_BASE_URL is deliberately NOT exported here.
REM PowerShell's Get-NetIPAddress has the same multi-NIC ambiguity as Java
REM and can pick a Docker/WSL virtual address. The backend's smarter
REM /api/public/server-info auto-detect (PublicController.detectPrimaryLanIp)
REM is now the authoritative source for the QR base URL. Setting the env var
REM here would lock Vite into whatever IP PowerShell happened to find first,
REM bypassing the smarter detector. Operators who NEED a specific value can
REM still set VITE_PUBLIC_BASE_URL in .env.local.

echo =======================================================
echo    WELCOME TO SMART BLOOD DONATION SYSTEM
echo =======================================================
echo.
echo [1/3] Starting Backend (Java Spring Boot) in a new window...
REM Phase 13: WHATSAPP_INTERNAL_TOKEN is left empty for the backend in dev so
REM it doesn't send the X-Internal-Token header; the WhatsApp service runs in
REM WHATSAPP_ALLOW_INSECURE mode (set below) which skips the header check.
REM In production both sides MUST set the same non-empty token.
start "Backend - Spring Boot" cmd /k "set WHATSAPP_ENABLED=true&& set WHATSAPP_SERVICE_URL=http://127.0.0.1:3001&& set WHATSAPP_INTERNAL_TOKEN=&& cd backend-spring && mvn spring-boot:run"

echo [2/3] Starting WhatsApp Microservice...
REM WhatsApp service requires WHATSAPP_INTERNAL_TOKEN (or WHATSAPP_ALLOW_INSECURE=true for local dev only).
REM Picking insecure dev mode here; production must set the token via env var.
REM Note: keep `set X=...& set Y=...& cmd` with single & to avoid value-bleed.
REM `set X=true&&` parses as setting X to "true&&".
start "WhatsApp Service" cmd /k "cd whatsapp-service & set WHATSAPP_ALLOW_INSECURE=true& set WHATSAPP_BIND_ADDRESS=127.0.0.1& npm start"

echo [3/3] Starting Frontend (React + Vite) in a new window...
REM Phase 13.2: VITE_PUBLIC_BASE_URL intentionally NOT set here (see comment
REM above). Frontend will fetch /api/public/server-info on dashboard mount to
REM get the correctly-scored LAN IP.
start "Frontend - React/Vite" cmd /k "set VITE_API_BASE_URL=%API_FOR_FRONTEND%&& npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo -------------------------------------------------------
echo SUCCESS: Backend, WhatsApp, and Frontend are starting up!
echo.
echo Backend (Laptop): %BACKEND_LOCAL%
echo Backend (Phone) : %BACKEND_PHONE%
echo Frontend (Laptop): %FRONTEND_LOCAL%
echo Frontend (Phone) : %FRONTEND_PHONE%
echo API used by Frontend: %API_FOR_FRONTEND%
echo.
echo NOTE: Please wait for the Backend to finish loading
echo before you try to log in (wait for 'Started BloodDonationApplication').
echo -------------------------------------------------------
echo.
echo Press any key to close this starter window...
pause > nul
