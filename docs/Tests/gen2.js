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