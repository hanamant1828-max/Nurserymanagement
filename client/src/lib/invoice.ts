import { format } from "date-fns";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Note: Kannada text requires custom font embedding in jsPDF.
// For browser printing, we use the HTML template in InvoicePrint component.
// This function remains for standard PDF downloads if needed, but the primary
// print functionality will be handled by the InvoicePrint component.

export const generateInvoice = (data: any) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.text("Kisan Hitech Nursery", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text("Kalloli - 591 224", 105, 28, { align: "center" });
  doc.text("Mob: 9986589865, 9663777255", 105, 34, { align: "center" });
  
  doc.line(20, 40, 190, 40);
  
  // Customer Info
  doc.setFontSize(12);
  doc.text(`Customer: ${data.customerName}`, 20, 50);
  doc.text(`Phone: ${data.phone}`, 20, 56);
  doc.text(`Village: ${data.village || "N/A"}`, 20, 62);
  
  doc.text(`Invoice No: K${data.id}`, 140, 50);
  doc.text(`Date: ${format(new Date(), "dd/MM/yyyy")}`, 140, 56);
  
  // Table
  const tableData = [
    [
      "1",
      data.lot?.variety?.name || "Plant Variety",
      data.bookedQty.toString(),
      data.perUnitPrice.toString(),
      data.totalAmount.toString()
    ]
  ];
  
  (doc as any).autoTable({
    startY: 70,
    head: [["Sl No", "Description", "Qty", "Rate", "Amount"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129] }
  });
  
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Summary
  doc.text(`Total Amount: Rs. ${data.totalAmount}`, 140, finalY);
  doc.text(`Advance Paid: Rs. ${data.advanceAmount}`, 140, finalY + 6);
  doc.text(`Balance: Rs. ${data.remainingBalance}`, 140, finalY + 12);
  
  doc.save(`Invoice_K${data.id}.pdf`);
};
