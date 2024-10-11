
// function processValueLine(line, currentKey) {
//     const [name, ...valueParts] = line.split('=');
//     const value = valueParts.join('=');
//     let batLine = '';

//     if (name === '@') {
//         batLine = `reg add "${currentKey}" /ve `;
//     } else {
//         batLine = `reg add "${currentKey}" /v "${name}" `;
//     }

//     if (value.startsWith('"')) {
//         batLine += `/t REG_SZ /d ${value} /f\n`;
//     } else if (value.toLowerCase().startsWith('hex:')) {
//         const hexData = value.substring(4).replace(/[,\s]/g, '');
//         batLine += `/t REG_BINARY /d ${hexData} /f\n`;
//     } else if (value.toLowerCase().startsWith('dword:')) {
//         const dwordValue = value.substring(6);
//         batLine += `/t REG_DWORD /d ${dwordValue} /f\n`;
//     } else if (value.toLowerCase().startsWith('qword:')) {
//         const qwordValue = value.substring(6);
//         batLine += `/t REG_QWORD /d ${qwordValue} /f\n`;
//     } else if (value.toLowerCase() === '-') {
//         batLine = name === '@' ?
//             `reg DELETE "${currentKey}" /ve /f\n` :
//             `reg DELETE "${currentKey}" /v "${name}" /f\n`;
//     } else {
//         const multiLineValue = value.replace(/\\0/g, '\n').replace(/\\\\/, '\\');
//         const valueType = multiLineValue.includes('%') ? 'REG_EXPAND_SZ' : 'REG_MULTI_SZ';
//         batLine += `/t ${valueType} /d "${multiLineValue}" /f\n`;
//     }

//     return batLine;
// }
