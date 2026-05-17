@echo off
TITLE Smart Blood Donation System - Starter
COLOR 0A
setlocal EnableDelayedExpansion

for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object {$_.IPAddress -notlike ''169.254*'' -and $_.IPAddress -ne ''127.0.0.1''} ^| Select-Object -First 1 -ExpandProperty IPAddress)"') do set LOCAL_IP=%%i
if "%LOCAL_IP%"=="" set LOCAL_IP=localhost

set FRONTEND_LOCAL=http://localhost:5173
set FRONTEND_PHONE=http://%LOCAL_IP%:5173
set BACKEND_LOCAL=http://localhost:8080
set BACKEND_PHONE=http://%LOCAL_IP%:8080
set API_FOR_FRONTEND=http://%LOCAL_IP%:8080/api

echo =======================================================
echo    WELCOME TO SMART BLOOD DONATION SYSTEM
echo =======================================================
echo.
echo [1/3] Starting Backend (Java Spring Boot) in a new window...
start "Backend - Spring Boot" cmd /k "cd backend-spring && mvn spring-boot:run"

echo [2/3] Starting WhatsApp Microservice...
start "WhatsApp Service" cmd /k "cd whatsapp-service && npm start"

echo [3/3] Starting Frontend (React + Vite) in a new window...
start "Frontend - React/Vite" cmd /k "set VITE_API_BASE_URL=%API_FOR_FRONTEND% && npm run dev -- --host 0.0.0.0 --port 5173"

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
