
const ExcelJS = require('exceljs');
(async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile('user.xlsx');
        const worksheet = workbook.getWorksheet(1);
        worksheet.eachRow((row, i) => {
            if (i > 1 && i < 10) {
                console.log(`Row ${i}: Col1=${JSON.stringify(row.getCell(1).value)}, Col2=${JSON.stringify(row.getCell(2).value)}`);
            }
        });
    } catch (e) {
        console.error(e);
    }
})();
