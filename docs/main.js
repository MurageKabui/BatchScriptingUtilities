// Initialize tooltips using tippy.js
function initializeTooltips() {
    tippy('#btnConvert', {
        theme: 'light',
        interactive: true,
        arrow: true,
        content: '<span>Convert this script to the <a href="https://en.wikipedia.org/wiki/Batch_file" style="color: aqua;">batch file equivalent</a></span>',
        allowHTML: true,
    });
    tippy('#btnClear', {
        content: 'Clear script!',
    });
    tippy('#btnStripCom', {
        content: 'Strips comments and minifies the registry file!',
    });
}

// Initialize Ace Editors
let regFileEditor, modalEditor;

function initializeEditors() {
    regFileEditor = ace.edit("fileContent");
    setupEditor(regFileEditor, "gruvbox", "ace/mode/registry");

    modalEditor = ace.edit("modalEditor");
    setupEditor(modalEditor, "gruvbox", "ace/mode/batchfile");
}

function setupEditor(editor, theme, mode) {
    editor.setTheme(`ace/theme/${theme}`);
    editor.session.setMode(mode);
    editor.setOptions({
        fontSize: "12px",
        showPrintMargin: false,
        showGutter: true,
        highlightActiveLine: true,
        wrap: true
    });
}

// Modal functions
function showModal(content) {
    modalEditor.setValue(content, -1);
    $('#modalBackdrop').addClass('show');
    $('#batchModal').addClass('show');
}

function closeModal() {
    $('#modalBackdrop').removeClass('show');
    $('#batchModal').removeClass('show');
}

// Batch conversion function
function convertRegToBat(regContent) {
    try {
        regContent = regContent.replace(/^\uFEFF/, '');
        const lines = regContent.split('\n');
        let batContent = `@ECHO OFF
@SETLOCAL EnableDelayedExpansion
@TITLE Registry Import Script
@COLOR 0A

@ECHO.
@ECHO  ╔════════════════════════════════════════╗
@ECHO  ║        Registry Import Process         ║
@ECHO  ╚════════════════════════════════════════╝
@ECHO.

@REM Check for Administrator privileges
NET SESSION >NUL 2>&1
IF %ERRORLEVEL% NEQ 0 (
    @ECHO   [!] This script requires Administrator privileges.
    @ECHO   [!] Please run as Administrator.
    @PAUSE >NUL
    @EXIT /B 1
)

@ECHO   [*] Starting registry import...
@ECHO.
`;
        let currentKey = '';
        let entryCount = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line === '' || line.startsWith(';')) continue;
            
            if (line.startsWith('[')) {
                currentKey = line.substring(1, line.length - 1);
                if (currentKey.startsWith('-')) {
                    // Handle key deletion
                    currentKey = currentKey.substring(1);
                    batContent += `@ECHO   [+] Processing key: ${currentKey}\n`;
                    batContent += `REG DELETE "${currentKey}" /f >NUL 2>&1 || @ECHO   [-] Failed to delete key\n`;
                } else {
                    batContent += `@ECHO   [+] Processing key: ${currentKey}\n`;
                    batContent += `REG ADD "${currentKey}" /f >NUL 2>&1 || @ECHO   [-] Failed to create key\n`;
                }
            } else if (line.includes('=')) {
                const { batLine, currentIndex } = processValueLine(line, currentKey, lines, i);
                batContent += batLine;
                i = currentIndex;
                entryCount++;
            }
        }

        batContent += `
@ECHO.
@ECHO   [✓] Process completed successfully
@ECHO   [i] Total entries processed: ${entryCount}
@ECHO.
@PAUSE >NUL
@ENDLOCAL
@EXIT /B 0`;

        return batContent;
    } catch (error) {
        return `@ECHO OFF
@COLOR 0C
@ECHO Error during conversion: ${error.message}
@PAUSE >NUL
@EXIT /B 1`;
    }
}


// Process individual value line
function processValueLine(line, currentKey, lines, currentIndex) {
    const [name, ...valueParts] = line.split('=');
    let value = valueParts.join('=').trim();
    let batLine = '@ECHO   [>] Setting value: ';

    // Handle multiline values
    if (value.endsWith('\\')) {
        let multilineValue = value;
        while (currentIndex < lines.length - 1 && multilineValue.endsWith('\\')) {
            currentIndex++;
            const nextLine = lines[currentIndex].trim();
            multilineValue = multilineValue.slice(0, -1) + nextLine;
        }
        value = multilineValue;
    }

    // Clean up the name - remove extra quotes
    const cleanName = name === '@' ? '@' : name.replace(/^"(.*)"$/, '$1');

    const regCommand = name === '@' 
        ? `REG ADD "${currentKey}" /ve`
        : `REG ADD "${currentKey}" /v "${cleanName}"`;

    if (value === '-') {
        batLine += `${cleanName}\n${name === '@' 
            ? `REG DELETE "${currentKey}" /ve /f`
            : `REG DELETE "${currentKey}" /v "${cleanName}" /f`} >NUL 2>&1 || @ECHO   [-] Failed to delete value\n`;
    } else {
        const { type, processedValue } = processRegistryValue(value);
        batLine += `${cleanName} (${type})\n${regCommand} /t ${type} /d ${processedValue} /f >NUL 2>&1 || @ECHO   [-] Failed to set value\n`;
    }

    return { batLine, currentIndex };
}

function processRegistryValue(value) {
    if (value.startsWith('"')) {
        return {
            type: 'REG_SZ',
            processedValue: cleanStringValue(value)
        };
    } else if (value.toLowerCase().startsWith('hex:')) {
        const hexData = value.substring(4).replace(/[,\\\s]/g, '');
        return {
            type: 'REG_BINARY',
            processedValue: hexData.length === 0 ? '""' : hexData
        };
    } else if (value.toLowerCase().startsWith('hex(2):')) {
        return {
            type: 'REG_EXPAND_SZ',
            processedValue: value.substring(7).replace(/[,\\\s]/g, '')
        };
    } else if (value.toLowerCase().startsWith('hex(7):')) {
        return {
            type: 'REG_MULTI_SZ',
            processedValue: value.substring(7).replace(/[,\\\s]/g, '')
        };
    } else if (value.toLowerCase().startsWith('dword:')) {
        return {
            type: 'REG_DWORD',
            processedValue: parseInt(value.substring(6), 16)
        };
    } else if (value.toLowerCase().startsWith('hex(b):')) {
        const hexValue = value.substring(7).replace(/[,\\\s]/g, '');
        return {
            type: 'REG_QWORD',
            processedValue: BigInt(`0x${hexValue}`).toString()
        };
    }
    
    // Improved default case handling
    if (value.includes('%')) {
        return {
            type: 'REG_EXPAND_SZ',
            processedValue: `"${value.replace(/"/g, '\\"').replace(/\\/g, '\\\\')}"`
        };
    }
    
    return {
        type: 'REG_SZ',
        processedValue: `"${value.replace(/"/g, '\\"').replace(/\\/g, '\\\\')}"`
    };
}

function processHexString(hexString) {
    // Remove all spaces, commas and line continuation characters
    const cleanHex = hexString.replace(/[,\\\s]/g, '');
    
    // For hex(2) values (REG_EXPAND_SZ), we'll keep the hex format
    // as it's more reliable than trying to convert to string
    return cleanHex;
}

function hexToString(hex) {
    return hex;
    let str = '';
    for (let i = 0; i < hex.length; i += 4) {
        const charCode = parseInt(hex.substr(i, 4), 16);
        if (charCode === 0) break; // Stop at null terminator
        str += String.fromCharCode(charCode);
    }
    return str;
}

function cleanStringValue(value) {
    // Remove surrounding quotes and handle escaping
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
    }
    // Escape special characters for batch script - single level of escaping
    return `"${value.replace(/"/g, '\\"').replace(/\\/g, '\\\\')}"`;
}

// Placeholder for fetching the next line in multiline hex data
function getNextLine() {
    // This function should implement how you fetch the next line in case of multiline hex values
    // For testing purposes, this can be simulated
    return ''; // Modify this as needed in real implementation
}


// Utility functions
function copyToClipboard() {
    const batchContent = modalEditor.getValue();
    navigator.clipboard.writeText(batchContent)
        .then(() => alert('Batch script copied to clipboard!'))
        .catch(err => console.error('Error copying text: ', err));
}

function downloadBatchFile() {
    const batchContent = modalEditor.getValue();
    const filename = $('#filenameInput').val() || 'script.bat';
    const blob = new Blob([batchContent], { type: 'text/plain' });
    const link = $('<a></a>').attr({
        href: URL.createObjectURL(blob),
        download: filename
    });
    link[0].click();
}

function formatBatchCode() {
    const batchContent = modalEditor.getValue();
    const formattedContent = formatBatchCodeImpl(batchContent);
    modalEditor.setValue(formattedContent, -1);
}

function formatBatchCodeImpl(code) {
    const lines = code.split('\n');
    let indentLevel = 0;
    const formattedLines = lines.map(line => {
        line = line.trim();
        if (line.toLowerCase().startsWith(':')) {
            indentLevel = 0;
        } else if (line.toLowerCase().startsWith('if') || line.toLowerCase().startsWith('for')) {
            const formatted = '  '.repeat(indentLevel) + line;
            indentLevel++;
            return formatted;
        } else if (line.toLowerCase() === ')') {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        return '  '.repeat(indentLevel) + line;
    });
    return formattedLines.join('\n');
}

// File handling functions
function handleFileDrop(e) {
    e.preventDefault();
    $(this).css('background-color', '');
    const file = e.originalEvent.dataTransfer.files[0];
    readFile(file);
}

function handleFileSelect() {
    const input = $('<input type="file">');
    input.on('change', function(e) {
        const file = e.target.files[0];
        readFile(file);
    });
    input.click();
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = e => regFileEditor.setValue(e.target.result);
    reader.readAsText(file);
}

// Event listeners
function addEventListeners() {
    const dropZone = $('#dropZone');
    dropZone.on('dragover', function(e) {
        e.preventDefault();
        $(this).css('background-color', 'rgba(0, 122, 204, 0.1)');
    });
    dropZone.on('dragleave drop', function() {
        $(this).css('background-color', '');
    });
    dropZone.on('drop', handleFileDrop);
    dropZone.on('click', handleFileSelect);

    $('#btnConvert').on('click', function() {
        const batchContent = convertRegToBat(regFileEditor.getValue());
        showModal(batchContent);
    });

    $('#btnClear').on('click', function() {
        regFileEditor.setValue("");
    });

    $('#btnStripCom').on('click', function() {
        const content = regFileEditor.getValue();
        const strippedContent = content.replace(/;.*$/gm, '').replace(/^\s*[\r\n]/gm, '');
        regFileEditor.setValue(strippedContent);
    });

    $('#closeModal, #closeBatch').on('click', closeModal);
    $('#copyBatch').on('click', copyToClipboard);
    $('#downloadBatch').on('click', downloadBatchFile);
    $('#formatBatch').on('click', formatBatchCode);
}

// Initialize the application
function initializeApp() {
    initializeTooltips();
    initializeEditors();
    addEventListeners();
}

// Run the initialization when the DOM is fully loaded
$(document).ready(initializeApp);
