@echo off
chcp 65001 >nul
title Отправка сайта на GitHub
cd /d "%~dp0"

echo.
echo === Отправка портфолио на GitHub ===
echo Папка: %cd%
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo Ошибка: Git не найден. Установите Git и добавьте его в PATH.
  pause
  exit /b 1
)

git add -A
git commit -m "Обновление сайта"
if errorlevel 1 (
  echo.
  echo Нечего коммитить ^(вы не меняли файлы^) или ошибка коммита.
  pause
  exit /b 0
)

git push
if errorlevel 1 (
  echo.
  echo Ошибка push. Проверьте интернет и вход в GitHub ^(или выполните git pull^).
  pause
  exit /b 1
)

echo.
echo Готово. Через 1-3 минуты обновится сайт на GitHub Pages.
echo.
pause
