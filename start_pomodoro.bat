@echo off
title Pomodoro Timer

cd /d "D:\github\Pomodoro_Timer"

set "PATH=D:\tools\node-v22.23.3-win-x64;%PATH%"

start "" cmd /k "npm.cmd run dev"

timeout /t 3 /nobreak >nul

start "" http://localhost:5173

exit
