import * as XLSX from "xlsx";

/**
 * Utility to export an array of JSON objects to an Excel (.xlsx) file.
 * 
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 * @param sheetName Name of the worksheet
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = "Sheet1") => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Convert JSON to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns based on the longest string in each column
  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    const colWidths = keys.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...data.map((row) => (row[key] ? row[key].toString().length : 0))
      );
      return { wch: maxLen + 2 }; // Add some padding
    });
    worksheet["!cols"] = colWidths;
  }
  
  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generate and download the file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
