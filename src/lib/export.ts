import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * Utility to export an array of JSON objects to an Excel (.xlsx) file.
 * 
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 * @param sheetName Name of the worksheet
 */
export const exportToExcel = async (data: any[], filename: string, sheetName: string = "Sheet1") => {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  if (data.length > 0) {
    // Generate columns based on the keys of the first object
    const keys = Object.keys(data[0]);
    worksheet.columns = keys.map(key => {
      // Calculate column width by finding the max length in that column
      const maxLen = Math.max(
        key.length,
        ...data.map((row) => (row[key] ? row[key].toString().length : 0))
      );
      
      return {
        header: key,
        key: key,
        width: maxLen + 2 // Add some padding
      };
    });
    
    // Add data rows
    data.forEach(row => {
      worksheet.addRow(row);
    });
    
    // Make header row bold
    worksheet.getRow(1).font = { bold: true };
  }
  
  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${filename}.xlsx`);
};
