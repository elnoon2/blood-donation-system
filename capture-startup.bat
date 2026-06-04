@echo off
TITLE Backend startup capture
REM ---------------------------------------------------------------------------
REM Captures the full backend startup log to startup.log in this directory so
REM the actual Spring exception (not just Maven's "BUILD FAILURE" trailer) can
REM be shared with the auditor.
REM
REM Usage:  capture-startup.bat
REM ---------------------------------------------------------------------------

cd backend-spring
echo Launching backend, writing log to ..\startup.log ...
echo (Wait for "Started BloodDonationApplication" OR a stack trace; Ctrl+C to stop.)
echo.
call mvn spring-boot:run > ..\startup.log 2>&1
echo.
echo Done. Log saved to: %CD%\..\startup.log
echo.
echo Inspect the last ~150 lines with:
echo     powershell "Get-Content ..\startup.log -Tail 150"
echo.
pause
