@Echo off
setlocal EnableDelayedExpansion

Rem Author Dennis Murage Kabue
Rem dennisk@zainahtech.com

mode con: cols=100 lines=78
Set UserFile="Accounts.txt"
Set Debugging=False 
Set "AdminTrueResponce= Admin  : True"
Set "AdminFalseResponce= Admin : False"

    IF "%PROCESSOR_ARCHITECTURE%" EQU "amd64" (
        >nul 2>&1 "%SYSTEMROOT%\SysWOW64\cacls.exe" "%SYSTEMROOT%\SysWOW64\config\system"
    ) ELSE (
        >nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
    )

    If '%errorlevel%' NEQ '0' (
        :: Echo %errorlevel%
        Echo.
            Rem Alternatively we interactively can UAC prompt using the Choice command like this ..  
                Title Warning ...
            Rem errorlevel set according to respective choice index at the /c flag.
            Echo.
            Echo.  ========================================================
            Echo.    Elevated privileges are required to run this Script,
            Echo.         Accept running the current script as admin ?
            Echo.  =========================================================
            ECho. 
            CHOICE /C YNC /M "Press Y for Yes, N for No or C for Cancel."
            If !errorlevel! EQU 1 (
                    Rem If user clicked Y for Yes
                    Goto :UACPrompt
                ) Else (
                    If !errorlevel! EQU 2 (
                            Echo You clicked No.. Exiting...
                            Pause
                            Exit 1
                        ) Else (
                            Cls
                            Echo You clicked C For Cancel
                            Pause
                            Exit 1
                            )
                )          
    ) else (
        rem Echo. !AdminTrueResponce!
        Goto :WhenAdminTrue
        )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params= %*
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0"" %params:"=""%", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
exit /b 0

:WhenAdminTrue
    Echo %cd%
    pushd "%CD%"
    CD /D "%~dp0"

    :: Check if the Local file With usernames exists before proceeding..
    If Exist "!UserFile!" (
        Rem Using Type command instead of directly looping thru the filehandle 
        Rem cos the file handle is normally locked from changes while a long list is being processed ..
        Rem thus error risk is minimal... plus Type commands outputs uncode to ASCII incase they're involved 
        Rem in the Account password string ..
        For /f "Skip=1 tokens=1,2,3,4,5,6 delims=, " %%a in (
            'Type ^"!UserFile!^"'
            ) Do (
                Rem Set Up some Respective tokens..
                Set "UAccountName=%%a"
                Set "UserFirstNme=%%b"
                Set "UserSecondName=%%c"
                Set "ThirdName=%%d"
                Set "UserPassword=%%e"
                Set "IfAdminYN=%%f"
                :: Avoid breaking the loop if the info doesn't exist. 
                If /i "!UAccountName!" NEQ "" (
                    Rem Check the UAccountNameLength... Ensure its LEQ 20 Chars before proceeding.
                    Rem Source [https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc771865(v=ws.11)]
                    Call :StringGetLength !UAccountName! lenghtUsername
                    Set "Length=!lenghtUsername!"
                    Rem Echo Validating Given Username Length before creating the user from our list... 
                    If !lenghtUsername! LEQ 20 (
                        Rem The Username is Less or equal to 20 .. check If letter Y exists so we know ..
                        Rem Whether to add the processed !UAccountName! to the local admin group...
                        Rem Echo !IfAdminYN!
                        If !IfAdminYN! EQU "Y" (
                                Echo.
                                Echo. Will Create Account using net user With :
                                Echo. Account username : !UAccountName!
                                Echo. Length           : !Length!
                                Echo. With Password    : !UserPassword!
                                Echo. And  Full Name   : !UserFirstNme! !UserSecondName! !ThirdName! 
                                Echo. Flag             : !IfAdminYN!
                                Echo. Confirm from File !UserFile! .
                            ) Else (
                                If '!IfAdminYN!' NEQ "Y" (
                                        Echo.
                                        Echo. Will Create Account using net user With :
                                        Echo. Account username : !UAccountName! Length : !Length!
                                        Echo. With Password    : !UserPassword!
                                        Echo. And  Full Name   : !UserFirstNme! !UserSecondName! !ThirdName! 
                                        Echo. Flag             : !IfAdminYN!
                                        Echo. Confirm from File !UserFile! .
                                    ) Else (
                                        Echo Invalid Parameter in The Y^|N Value..
                                    )
                                )
                        REM will add the actual Net user func here..
                        Call :FuncCreateUserAccount '!UAccountName!' '!UserFirstNme!' '!!' '!!' '!!''
                    ) Else (
                        Echo Warning ..!UAccountName! Length Exceeded 20 Characters.
                        )
                    )
                )
        ) Else (
            Title File Error..
            Echo File !UserFile! Does not Exist in %cd%
            rem Exit 1
        )
Echo Action Completed . Exiting.
Pause
Exit
::  Call :FuncCreateUserAccount -create '!UAccountName!' '!UserFirstNme!' '!!' '!!' '!!''  
::  FuncCreateUserAccount  : Adds a user based on specific params..
::      Arg1 = UAccountName
::      Arg2 = Password
::      Arg3 = Value/Description.
REM CURRENTLY here ... 

Rem Create a local account
:FuncCreateUserAccount
    If "%~1" EQU "-create" (
            Rem  You Want to create an account with name : [%~2]
            Echo. 
        )
        Rem Net user "%~1" /fullname:"%~2" /add /passwordreq:yes
exit /b 



Rem Function StringGetLength.
Rem Retrieve the Length of the given Account Username .. Coz according to ms documentation :
Rem A username can of 20 Characters at max . 
Rem This Func:
Rem     Returns The nLength parsed to Var Param2: "%~2"
Rem     Later use this to limit name of the user account can have as many as 20 characters.
:StringGetLength <password> <nValidator>
    Echo %~1> UPassword.Length
    For %%? in (UPassword.Length) do (
        Echo %%~z?
        set /a %~2=%%~z? -2
        Set ExitCode=%~2
        )
    Del /f /q "UPassword.Length"
Exit /b !ExitCode!