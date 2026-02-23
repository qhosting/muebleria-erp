const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '../../anterior/DQ_EXPORTAR.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let output = '--- ANALYSIS OF DQ_EXPORTAR.xlsx ---\n';
    output += `Sheet Name: ${sheetName}\n`;
    output += `Total Rows: ${jsonData.length}\n`;

    if (jsonData.length > 0) {
        output += `Headers: ${JSON.stringify(jsonData[0])}\n`;
    }
    if (jsonData.length > 1) {
        output += `Row 2: ${JSON.stringify(jsonData[1])}\n`;
    }

    fs.writeFileSync(path.join(__dirname, 'analysis_export.txt'), output);
    console.log('Analysis written to analysis_export.txt');
} catch (error) {
    console.error('Error:', error.message);
}
