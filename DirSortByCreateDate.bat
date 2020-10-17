@Echo Off
SetLocal EnableDelayedExpansion

rem ===============================================================
rem Author : Kabue Murage 
rem Forums : 254peepee
rem directory sorting using winbatch

rem Copy this file to : C:\Users\%username%\AppData\Roaming\Microsoft\Windows\SendTo
rem and using file explorer, select the directory you want to sort and right click
rem for the context menu and navigate to "Send To" and select "DirSortByCreateDate.bat"

rem ===============================================================

set iSortFiles_Folders=3
rem 0 = Will skip sorting folders. [default]
rem 1 = Will also sort folders.
rem 3 = Sort both files and folders


set ifastmode=1
rem 0 = slow sorting with colored output.
rem 1 = fast sorting with plain output.

rem space delimited filetypes to ignore..
rem set sIgnoredFileTypes=.bat .ini .ink

rem help params
set vHelpParameters=^-h ^--h ^--help help

Set AttribHidden=/a:h /a:-h

	set ifolderCount=0
	set ifileCount=0
	set iTotal_f=0

pushd "%~1"
	call :Settings "%cd%" !iSortFiles_Folders! cm
	echo %cm%
	pause
	set "Start=%TIME%"
	::delims is disabled # eol is disabled tokens=* is redundant
	for /f "skip=5 tokens=1,2,4,5* delims= " %%a in ('!cm! /a:-d /o:d /t:c') do (
		if "%%~c" NEQ "bytes" (
			rem creation date: %%~a
			rem day month year
			call :cnt totalcount NumberFiles 0
			set "filename=%%~d"
			call :IsDir "!filename!" isd
			if !isd! EQU 1 (
				call :cnt ifolderCount foldervar 0
				if %ifastmode% NEQ 1 ( 
					call :cl 0b " Sorting folder "
					call :cl 0c ": !filename!"
					echo.
				) else (echo Sorting folder !filename!)
			) else (
				call :cnt ifileCount filesCountvar 0
				if %ifastmode% NEQ 1 ( 
					call :cl 0b " Found a file called "
					call :cl 0c ": !filename!"
					echo.
				) else (echo Found a file called !filename!)
			)
			for /f "tokens=1,2,3 delims=/ " %%k in ("%%~a") do (
					call :iDate2sMonth_resolve "%%k" "%%l" "%%m" sMonth
					call :sortme "!filename!" "!sMonth!" "%%m"
			)
		)
		Title Sorted !ifolderCount! folders and !ifileCount! files.
	)
set "End=%TIME%"
call :timediff Elapsed Start End
call :GetTotal !ifolderCount! !ifileCount! iTotal_f
Title Sorted  !ifolderCount! folders and !ifileCount! files , total :!iTotal_f! in %cd%, Elapsed time : %Elapsed%
rem clean up temp file by func cl.
if %ifastmode% NEQ 1 if exist "X" del /f /q "X"
popd

pause
exit /b



:GetTotal iCount1 iCount2 Resultvar
set _n1=%1
set _n2=%2
set /a _total=!_n1!+!_n2!
set %3=%_total%
exit /b

rem dynamic counter.
:cnt VarName VarOutPut initialVal
	if not defined %1 (SET %1=%3)
	Set "%2=%1"
	set /a %1+=1
	set %2=%2
exit /b

rem Sort function
:sortme <file or folder> <creation month = !sMonth!> <year mod>
	rem fix illegal chars in filename that may cause an error.
	set "_f=%~1"

	If exist "%cd%\%~2 %~3\" (
		Echo.    File   [!_f!] was created on : %~2  year : %~3
		Echo.    Moving [!_f!] to ".\%~2 %~3\"		
		rem move /Y "!_f!" "%cd%\!sMonth! %%m\"
	) else (
		Echo.    Folder [!_f!] was created on : %~2 year : %~3
		Echo.    Folder [./%~2 %~3] does not exist, making it..
		rem if not exist "%cd%\!sMonth! %%m\" (md "%cd%\!sMonth! %%m\")
		Echo.    moving [!_f!] to ".\%~2 %~3\"
		rem move /Y "%%a" "%cd%\!sMonth! %%m\"
	)
exit /b

rem evaluate user settings
:Settings <sFQPN> <foldervaretting> <FinalCommand>
	rem Eval settings..
	if /i %2 EQU 1 (set _fol=D) else (
			if /i %2 EQU 0 (set _fol=-D) else (
				if /i %2 EQU 3 (
					set %3=dir "%~1"
					exit /b)
				)
		)
	set %3=dir "%~1" /A:!_fol!
exit /b

:cl
if not defined null (
	for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do (set "null=%%a")
	) 
<nul > X set /p ".=."
set "param=^%~2" !
set "param=!param:"=\"!"
findstr /p /A:%1 "." "!param!\..\X" nul
<nul set /p ".=%null%%null%%null%%null%%null%%null%%null%"
exit /b

:iDate2sMonth_resolve <iMonth> <iday> <iYear> <smonthVar>
Set /a Counter=0
call :strrep "%~1" "0" "" iMonth
For %%a in (January February March April May June July August September October November December) do (
        Set /a Counter=!Counter!+1
        If /i "!counter!" EQU "!iMonth!" (
                set "%4=%%a"
                exit /b 0)
        Set Counter=!Counter!
)
exit /b 1

rem example : call :IsDir "!filename!" isd
rem if !isd! EQU 1 Echo Found a folder : %%a
:IsDir <sFQPN> <var>
set ATTR=%~a1
set DIRATTR=%ATTR:~0,1%
if /I "%DIRATTR%"=="d" (SET "%2=1") else (SET "%2=0")
goto :eof

:timediff <outDiff> <inStartTime> <inEndTime>
    set "Input=!%~2! !%~3!"
    for /F "tokens=1,3 delims=0123456789 " %%A in ("!Input!") do set "time.delims=%%A%%B "
	for /F "tokens=1-8 delims=%time.delims%" %%a in ("%Input%") do (
		    for %%A in ("@h1=%%a" "@m1=%%b" "@s1=%%c" "@c1=%%d" "@h2=%%e" "@m2=%%f" "@s2=%%g" "@c2=%%h") do (
		        for /F "tokens=1,2 delims==" %%A in ("%%~A") do (for /F "tokens=* delims=0" %%B in ("%%B") do set "%%A=%%B")
		    )
	    )
    set /a "@d=(@h2-@h1)*360000+(@m2-@m1)*6000+(@s2-@s1)*100+(@c2-@c1), @sign=(@d>>31)&1, @d+=(@sign*24*360000), @h=(@d/360000), @d%%=360000, @m=@d/6000, @d%%=6000, @s=@d/100, @c=@d%%100"
    if %@h% LEQ 9 set "@h=0%@h%"
    if %@m% LEQ 9 set "@m=0%@m%"
    if %@s% LEQ 9 set "@s=0%@s%"
    if %@c% LEQ 9 set "@c=0%@c%"
    set "%~1=%@h%%time.delims:~0,1%%@m%%time.delims:~0,1%%@s%%time.delims:~1,1%%@c%"
exit /b

:strrep <string> <word> <replace> <result>
	SET "string=%~1"
	SET "%4=!string:%~2=%~3!"
GOTO :EOF
