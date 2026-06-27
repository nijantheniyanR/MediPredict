@echo off
setlocal enabledelayedexpansion

:: Navigate to the directory where the batch file is located
cd /d "%~dp0"

echo ===================================================
echo   MediPredict Automated GitHub Push Tool
echo ===================================================
echo.

:: Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed on this system.
    echo Please download and install Git from https://git-scm.com/
    echo.
    pause
    exit /b
)

:: Prompt user for repository URL
set /p "repo_url=Paste your GitHub repository URL: "
if "%repo_url%"=="" (
    echo [ERROR] No URL provided. Exiting.
    pause
    exit /b
)

echo.
echo [1/5] Initializing local Git repository...
if not exist ".git" (
    git init
) else (
    echo Git repository already initialized.
)

echo.
echo [2/5] Staging files...
git add .

echo.
echo [3/5] Creating initial commit...
git commit -m "Initial commit: MediPredict Diabetes Disease Prediction Web App"

echo.
echo [4/5] Setting main branch and linking remote origin...
git branch -M main
:: Remove remote origin if it already exists to avoid conflict errors
git remote remove origin >nul 2>nul
git remote add origin %repo_url%

echo.
echo [5/5] Pushing project files to GitHub...
echo (You may be prompted by Windows to sign in to your GitHub account)
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo   SUCCESS: Your project was pushed to GitHub!
    echo ===================================================
) else (
    echo.
    echo [WARNING] There was an issue pushing to the repository.
    echo Please check your URL, internet connection, and credentials.
)
echo.
pause
