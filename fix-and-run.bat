@echo off
TITLE Smart Blood Donation System - Fix & Run
COLOR 0C
REM ----------------------------------------------------------------------
REM WARNING: This script is DESTRUCTIVE. It force-kills every running
REM java.exe and node.exe on the machine and deletes backend-spring/target.
REM Run it only on a personal developer workstation. Never run on a shared
REM host or a server that may have other Java/Node processes you care about.
REM ----------------------------------------------------------------------
echo =======================================================
echo    FIXING SYSTEM AND CLEARING CACHE  (DESTRUCTIVE)
echo =======================================================
echo.
echo [1/3] Closing any running Java and Node processes...
taskkill /F /IM java.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
echo.
echo [2/3] Deleting old compiled files (target folder)...
if exist "backend-spring\target" rmdir /s /q "backend-spring\target"
echo.
echo [3/3] Rebuilding the system...
echo This may take a minute, please wait for 'BUILD SUCCESS'...
cd backend-spring && call mvn clean install -DskipTests
echo.
echo =======================================================
echo    SYSTEM FIXED! STARTING NOW...
echo =======================================================
cd ..
start run-project.bat
echo.
echo You can close this window now.
pause
