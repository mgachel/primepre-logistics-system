import * as XLSX from 'xlsx';

interface ClientExportData {
  shipping_mark: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export const exportClientsToExcel = (clients: ClientExportData[]) => {
  // Create worksheet data with headers
  const worksheetData = [
    ['Shipping Mark', 'First Name', 'Last Name', 'Email', 'Phone Number'],
    ...clients.map(client => [
      client.shipping_mark || '-',
      client.first_name || '-',
      client.last_name || '-',
      client.email || '-',
      client.phone || '-',
    ])
  ];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Shipping Mark
    { wch: 20 }, // First Name
    { wch: 20 }, // Last Name
    { wch: 30 }, // Email
    { wch: 15 }, // Phone Number
  ];

  // Style the header row (bold)
  const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "E8E8E8" } }
  };

  // Apply header styling to first row
  ['A1', 'B1', 'C1', 'D1', 'E1'].forEach(cell => {
    if (ws[cell]) {
      ws[cell].s = headerStyle;
    }
  });

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Clients');

  // Generate filename with current date
  const date = new Date().toISOString().split('T')[0];
  const filename = `Clients_Export_${date}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);

  return filename;
};
