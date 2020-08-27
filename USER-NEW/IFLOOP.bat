@echo off

Set /a Counter=0
Call :GetCurrentMonth CurrentMonthIndex
For %%a in (
    January February March April May June July August September October November December
    ) do (
        Set /a Counter=!Counter!+1
        Echo. %%a
        If /i "!counter!" EQU "!CurrentMonthIndex!" (
                Echo Reched Current Month. 
                Pause
            )
        Set Counter=!Counter!
)

Echo Done.
Pause
exit /b


:GetCurrentMonth <ReturnIndexVar>
    FOR /F "skip=1 tokens=4 delims= " %%G IN (
        'WMIC Path Win32_LocalTime Get Day^,Hour^,Minute^,Month^,Second^,Year /Format:table'
        ) DO (
            Set %~1=%%G
            )
Exit /b