import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CargoItem {
  shipping_mark: string;
  quantity: number;
  cbm?: number;
  tracking_numbers?: string[];
  tracking_number?: string;
}

interface GroupedItem {
  shipping_mark: string;
  quantity: number;
  cbm: number;
  tracking_numbers: string;
}

export interface PackingListData {
  containerNumber: string;
  loadingDate: string;
  eta: string;
  cargoType: 'air' | 'sea';
  items: CargoItem[];
}

export const generatePackingListPDF = (data: PackingListData) => {
  const doc = new jsPDF();
  
  // Company header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PRIME PRE LIMITED', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('054 043 0288', 105, 27, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PACKING LIST', 105, 40, { align: 'center' });
  
  // Container details
  const detailsY = 50;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const dateText = data.loadingDate 
    ? `${new Date(data.loadingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`
    : 'N/A';
  
  doc.text(`${dateText} LOADING`, 105, detailsY, { align: 'center' });
  
  const etaText = data.eta 
    ? `ETA: ${new Date(data.eta).toLocaleDateString('en-GB', { day: '2-digit', month: 'long' }).toUpperCase()}`
    : '';
  
  if (etaText) {
    doc.text(etaText, 105, detailsY + 7, { align: 'center' });
  }
  
  // Group items by shipping mark
  const groupedData: { [key: string]: GroupedItem } = {};
  
  data.items.forEach((item) => {
    const mark = item.shipping_mark || 'NO MARK';
    
    if (!groupedData[mark]) {
      groupedData[mark] = {
        shipping_mark: mark,
        quantity: 0,
        cbm: 0,
        tracking_numbers: '',
      };
    }
    
  groupedData[mark].quantity += item.quantity || 0;
  // Treat CBM as per-item cbm multiplied by quantity when provided
  const itemCbm = (item.cbm || 0) * (item.quantity || 1);
  groupedData[mark].cbm += itemCbm;
    
    // Collect tracking numbers
    const trackingNums = item.tracking_numbers || (item.tracking_number ? [item.tracking_number] : []);
    if (trackingNums.length > 0) {
      const existingNums = groupedData[mark].tracking_numbers 
        ? groupedData[mark].tracking_numbers.split(', ')
        : [];
      const allNums = [...new Set([...existingNums, ...trackingNums])].filter(Boolean);
      groupedData[mark].tracking_numbers = allNums.join(', ');
    }
  });
  
  // Convert to array and sort by shipping mark
  const tableData = Object.values(groupedData).sort((a, b) => 
    a.shipping_mark.localeCompare(b.shipping_mark)
  );
  
  // Prepare table data
  const tableRows = tableData.map((item) => [
    item.shipping_mark,
    item.quantity.toString(),
    item.cbm > 0 ? item.cbm.toFixed(3) : '0.000',
    item.tracking_numbers || '-',
  ]);
  
  // Calculate totals
  const totalQuantity = tableData.reduce((sum, item) => sum + item.quantity, 0);
  const totalCBM = tableData.reduce((sum, item) => sum + item.cbm, 0);
  
  // Add totals row
  tableRows.push([
    'TOTAL',
    totalQuantity.toString(),
    totalCBM.toFixed(3),
    '',
  ]);
  
  // Table headers
  const headers = [
    ['SHIPPING MARK', 'QUANTITY', 'CBM', 'SUPPLIER TRACKING NO.'],
  ];
  
  // Generate table
  autoTable(doc, {
    head: headers,
    body: tableRows,
    startY: etaText ? detailsY + 15 : detailsY + 10,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      halign: 'center',
    },
    bodyStyles: {
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'left', cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      // Make the last row (totals) bold
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  
  // Generate filename
  const filename = `Packing_List_${data.containerNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  // Save PDF
  doc.save(filename);
};

// Generate client list PDF without CBM column
export const generateClientListPDF = (data: PackingListData) => {
  const doc = new jsPDF();
  
  // Company header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PRIME PRE LIMITED', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('054 043 0288', 105, 27, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT LIST', 105, 40, { align: 'center' });
  
  // Container details
  const detailsY = 50;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const dateText = data.loadingDate 
    ? `${new Date(data.loadingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`
    : 'N/A';
  
  doc.text(`${dateText} LOADING`, 105, detailsY, { align: 'center' });
  
  const etaText = data.eta 
    ? `ETA: ${new Date(data.eta).toLocaleDateString('en-GB', { day: '2-digit', month: 'long' }).toUpperCase()}`
    : '';
  
  if (etaText) {
    doc.text(etaText, 105, detailsY + 7, { align: 'center' });
  }
  
  // Group items by shipping mark
  const groupedData: { [key: string]: GroupedItem } = {};
  
  data.items.forEach((item) => {
    const mark = item.shipping_mark || 'NO MARK';
    
    if (!groupedData[mark]) {
      groupedData[mark] = {
        shipping_mark: mark,
        quantity: 0,
        cbm: 0,
        tracking_numbers: '',
      };
    }
    
    groupedData[mark].quantity += item.quantity || 0;
    groupedData[mark].cbm += item.cbm || 0;
    
    // Collect tracking numbers
    const trackingNums = item.tracking_numbers || (item.tracking_number ? [item.tracking_number] : []);
    if (trackingNums.length > 0) {
      const existingNums = groupedData[mark].tracking_numbers 
        ? groupedData[mark].tracking_numbers.split(', ')
        : [];
      const allNums = [...new Set([...existingNums, ...trackingNums])].filter(Boolean);
      groupedData[mark].tracking_numbers = allNums.join(', ');
    }
  });
  
  // Convert to array and sort by shipping mark
  const tableData = Object.values(groupedData).sort((a, b) => 
    a.shipping_mark.localeCompare(b.shipping_mark)
  );
  
  // Prepare table data WITHOUT CBM column
  const tableRows = tableData.map((item) => [
    item.shipping_mark,
    item.quantity.toString(),
    item.tracking_numbers || '-',
  ]);
  
  // Calculate totals
  const totalQuantity = tableData.reduce((sum, item) => sum + item.quantity, 0);
  
  // Add totals row (without CBM)
  tableRows.push([
    'TOTAL',
    totalQuantity.toString(),
    '',
  ]);
  
  // Table headers WITHOUT CBM column
  const headers = [
    ['SHIPPING MARK', 'QUANTITY', 'SUPPLIER TRACKING NO.'],
  ];
  
  // Generate table
  autoTable(doc, {
    head: headers,
    body: tableRows,
    startY: etaText ? detailsY + 15 : detailsY + 10,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      halign: 'center',
    },
    bodyStyles: {
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 60 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'left', cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      // Make the last row (totals) bold
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  
  // Generate filename
  const filename = `Client_List_${data.containerNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  // Save PDF
  doc.save(filename);
};
