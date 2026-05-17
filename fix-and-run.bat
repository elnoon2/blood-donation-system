@echo off
TITLE Smart Blood Donation System - Fix & Run
COLOR 0C
echo =======================================================
echo    FIXING SYSTEM AND CLEARING CACHE
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
