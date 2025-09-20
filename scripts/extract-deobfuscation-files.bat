@echo off
REM Script to extract deobfuscation files from Android build
REM This script helps locate and copy deobfuscation files for Google Play Console upload

echo 🔍 Extracting deobfuscation files from Android build...

REM Check if we're in the right directory
if not exist "android" (
    echo ❌ Error: Please run this script from the project root directory
    exit /b 1
)

REM Create output directory
set OUTPUT_DIR=deobfuscation-files
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo 📁 Looking for mapping files...

REM Look for mapping files
for /r android %%i in (mapping.txt) do (
    echo 📋 Found mapping file: %%i
    copy "%%i" "%OUTPUT_DIR%\mapping.txt" >nul
    goto :found
)

echo ⚠️  No mapping files found. Make sure you've built the release version with ProGuard enabled.
echo 💡 Run: eas build --profile production --platform android
goto :end

:found
echo ✅ Mapping files copied to %OUTPUT_DIR%\

echo.
echo 📤 Upload these files to Google Play Console:
echo    1. Go to Google Play Console
echo    2. Select your app
echo    3. Go to Release ^> App bundle explorer
echo    4. Select your release
echo    5. Upload the mapping.txt file(s) in the 'Deobfuscation files' section
echo.
echo 🔧 Files in %OUTPUT_DIR%\:
dir /b "%OUTPUT_DIR%"
echo.
echo 💡 Tip: Keep these files safe - you'll need them to analyze crash reports!

:end
pause
