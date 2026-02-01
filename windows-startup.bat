@echo off
REM Windows System Startup Script
REM Advanced AI Agent Architecture - Windows Environment

echo 🚀 Starting Advanced AI Agent System - Windows Environment
echo =====================================================

REM Check if running on Windows
ver | findstr /i "windows" >nul
if %errorlevel% neq 0 (
    echo ❌ This script is designed for Windows systems only
    exit /b 1
)

REM Set working directory
cd /d "%~dp0"

REM Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    exit /b 1
)

REM Check npm installation
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    exit /b 1
)

echo ✅ Node.js version: 
node --version
echo ✅ npm version:
npm --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Check if Ollama is running
tasklist | findstr /i "ollama.exe" >nul
if %errorlevel% equ 0 (
    echo ✅ Ollama service is running
) else (
    echo ⚠️  Ollama service is not running. Please start Ollama service.
)

REM Check MySQL service
sc query mysql >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=4" %%s in ('sc query mysql ^| findstr STATE') do set mysql_state=%%s
    if "%mysql_state%"=="RUNNING" (
        echo ✅ MySQL service is running
    ) else (
        echo ⚠️  MySQL service is not running. Please start MySQL service.
    )
) else (
    echo ⚠️  MySQL service not found. Please install MySQL service.
)

REM Start backend server
echo 🔄 Starting backend server...
cd server
start "Backend Server" cmd /k "npm run dev"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend server
echo 🔄 Starting frontend server...
cd ..
start "Frontend Server" cmd /k "npm run dev"

REM Wait for frontend to start
timeout /t 5 /nobreak >nul

echo 🎉 System startup complete!
echo 📋 Access points:
echo    - Frontend Admin Panel: http://localhost:3000
echo    - Backend API: http://localhost:8000
echo    - Health Check: curl http://localhost:8000/health

echo.
echo Press any key to exit...
pause >nul
