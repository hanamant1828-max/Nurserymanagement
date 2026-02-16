import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

// For jspdf-autotable type augmentation
declare module "jspdf" {
  interface jsPDF {
    autoTable: any;
  }
}

interface InvoiceData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerVillage: string;
  customerPhone: string;
  date: Date;
  items: Array<{
    variety: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  totalAmount: number;
  advancePaid: number;
  remainingBalance: number;
  vehicleDetails?: string;
}

export const generateInvoice = (data: InvoiceData) => {
  const doc = jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Header - Mimicking the image
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text("Kisan Hitech Nursery", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.text("Kalloli - 591 224", 105, 26, { align: "center" });
  
  doc.setFontSize(9);
  doc.text("Mob: 9986589865, 9663777255, 7348998635", 200, 15, { align: "right" });

  // Customer Details Box
  doc.setDrawColor(0);
  doc.rect(10, 35, 190, 30); // Main customer box
  
  doc.setFontSize(11);
  doc.text(`Customer: ${data.customerName}`, 15, 42);
  doc.text(`Village: ${data.customerVillage}`, 15, 50);
  doc.text(`Phone: ${data.customerPhone}`, 15, 58);
  
  const invoiceDate = data.date instanceof Date && !isNaN(data.date.getTime()) 
    ? data.date 
    : new Date();

  doc.text(`No: ${data.orderNumber}`, 150, 42);
  doc.text(`Date: ${format(invoiceDate, "dd/MM/yyyy")}`, 150, 50);

  // Items Table
  const tableData = data.items.map((item, index) => [
    index + 1,
    item.variety,
    item.quantity,
    (Number(item.rate) || 0).toFixed(2),
    (Number(item.total) || 0).toFixed(2)
  ]);

  doc.autoTable({
    startY: 65,
    head: [["S.No", "Variety", "Qty", "Rate", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 80 },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 40, halign: "right" }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Summary section
  doc.setDrawColor(0);
  doc.rect(10, finalY + 5, 190, 40);
  
  doc.setFontSize(11);
  doc.text("Total Amount:", 140, finalY + 15, { align: "right" });
  doc.text(`INR ${data.totalAmount.toLocaleString()}`, 195, finalY + 15, { align: "right" });
  
  doc.text("Advance Paid:", 140, finalY + 25, { align: "right" });
  doc.text(`INR ${data.advancePaid.toLocaleString()}`, 195, finalY + 25, { align: "right" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Remaining Balance:", 140, finalY + 35, { align: "right" });
  doc.text(`INR ${data.remainingBalance.toLocaleString()}`, 195, finalY + 35, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Vehicle Details: ${data.vehicleDetails || "N/A"}`, 15, finalY + 15);
  
  // Footer
  doc.setFontSize(8);
  doc.text("Payment Info: G-Pay / Phone Pe: 9986589865", 15, finalY + 50);
  doc.text("Kisan Hitech Nursery, Kalloli | A/c No. 918020082321165 | IFSC: UTIB0000482", 15, finalY + 55);

  doc.save(`Invoice_${data.orderNumber}.pdf`);
};
