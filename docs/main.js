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
        let batContent = '@ECHO OFF\nTitle Reg2Bat Online Converter\n\n';
        let currentKey = '';

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line === '' || line.startsWith(';')) continue;
            if (line.startsWith('Windows Registry Editor')) {
                batContent += 'echo Converting registry file...\n';
            } else if (line.startsWith('[')) {
                currentKey = line.substring(1, line.length - 1);
                batContent += `REG add "${currentKey}" /f\n`;
            } else if (line.includes('=')) {
                const { batLine, currentIndex } = processValueLine(line, currentKey, lines, i);
                batContent += batLine;
                i = currentIndex; // Update the index in case of multiline values
            }
        }

        batContent += '\n\n@echo Conversion completed.\n@Pause>nul';
        return batContent;
    } catch (error) {
        console.error('Error during conversion:', error);
        return `@ECHO OFF\necho Error during conversion: ${error.message}\n@Pause>nul`;
    }
}

// Process individual value line
function processValueLine(line, currentKey, lines, currentIndex) {
    const [name, ...valueParts] = line.split('=');
    let value = valueParts.join('=').trim();
    let batLine = '';

    if (name === '@') {
        batLine = `REG add "${currentKey}" /ve `;
    } else {
        batLine = `REG add "${currentKey}" /v "${name.replace(/"/g, '\\"')}" `;
    }

    // Handle multiline values
    while (value.endsWith('\\') && currentIndex < lines.length - 1) {
        currentIndex++;
        value += lines[currentIndex].trim();
    }

    if (value.startsWith('"')) {
        batLine += `/t REG_SZ /d ${cleanStringValue(value)} /f\n`;
    } else if (value.toLowerCase().startsWith('hex:')) {
        let hexData = value.substring(4).replace(/[,\\\s]/g, '');
        batLine += `/t REG_BINARY /d ${hexData} /f\n`;
    } else if (value.toLowerCase().startsWith('hex(2):')) {
        let hexData = value.substring(7).replace(/[,\\\s]/g, '');
        let decodedString = hexToString(hexData);
        batLine += `/t REG_EXPAND_SZ /d "${decodedString.replace(/"/g, '\\"')}" /f\n`;
    } else if (value.toLowerCase().startsWith('dword:')) {
        const dwordValue = parseInt(value.substring(6), 16);
        batLine += `/t REG_DWORD /d ${dwordValue} /f\n`;
    } else if (value.toLowerCase().startsWith('qword:')) {
        const qwordValue = BigInt(`0x${value.substring(6)}`).toString();
        batLine += `/t REG_QWORD /d ${qwordValue} /f\n`;
    } else if (value === '-') {
        batLine = name === '@' ?
            `REG DELETE "${currentKey}" /ve /f\n` :
            `REG DELETE "${currentKey}" /v "${name.replace(/"/g, '\\"')}" /f\n`;
    } else {
        // Handle REG_EXPAND_SZ and REG_MULTI_SZ
        const multiLineValue = value.replace(/\\0/g, '\0').replace(/\\\\/g, '\\');
        const valueType = multiLineValue.includes('%') ? 'REG_EXPAND_SZ' : 'REG_MULTI_SZ';
        batLine += `/t ${valueType} /d "${multiLineValue.replace(/"/g, '\\"')}" /f\n`;
    }

    return { batLine, currentIndex };
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
    return `"${value.slice(1, -1).replace(/"/g, '\\"').replace(/\\\\/g, '\\')}"`; // Strip surrounding quotes, escape inner quotes, and handle backslashes
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