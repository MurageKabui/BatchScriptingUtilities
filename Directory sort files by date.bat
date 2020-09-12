@Echo Off & CLS
SetLocal EnableDelayedExpansion

For /F "tokens=*" %%a In ('dir "%cd%" /b') Do (
	for /f "tokens=1,2,3 delims=/ " %%k in ('Echo. %%~ta') do (
			call :iDate2sMonth_resolve "%%k" "%%l" "%%m" sMonth
			If exist "%cd%\!sMonth! %%m\" (
				Echo Moving file "%%a" to "%cd%\!sMonth! %%m\"
				move /Y "%%a" "%cd%\!sMonth! %%m\"
				) else (
					Echo Making folder "%cd%\!sMonth! %%m\"
					md "%cd%\!sMonth! %%m\"
					Echo moving file "%%a" to "%cd%\!sMonth! %%m\"
					move /Y "%%a" "%cd%\!sMonth! %%m\"
				)
		)
	rem Pause
)
Echo Done.
exit /b 

:iDate2sMonth_resolve <iMonth> <iday> <iYear> <smonthVar>
Set /a Counter=0
call :str.rep "%~1" "0" "" iMonth
For %%a in (January February March April May June July August September October November December) do (
        Set /a Counter=!Counter!+1
        If /i "!counter!" EQU "!iMonth!" (
                set "%4=%%a"
                exit /b 0
                )
        Set Counter=!Counter!
)
exit /b 1

:IsDir <sFQPN> (can verify with errorlevel)
PUSHD %1 2>NUL && SET __isdir=0 || SET __isdir=1 & POPD
exit /b %__isdir%

:str.rep <string> <word> <replace> <result>
	SET "string=%~1"
	SET "%4=!string:%~2=%~3!"
GOTO :EOF
