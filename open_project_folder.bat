@echo off
setlocal
set "PROJECT_DIR=D:\github\Pomodoro_Timer"
echo [1/3] 啟動專案資料夾...
if exist "%PROJECT_DIR%" (
    start "" "%PROJECT_DIR%"
)
echo [2/3] 開啟命令提示字元，位置已切換至專案資料夾...
if exist "%~dp0open_project_folder.bat" (
    start "" "cmd.exe" /k "cd /d %PROJECT_DIR%"
)
echo [3/3] 按任意鍵結束本批次檔。
pause

