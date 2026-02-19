import { format } from "date-fns";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";

// Note: Kannada text requires custom font embedding in jsPDF.
// For browser printing, we use the HTML template in InvoicePrint component.
// To ensure consistency, we'll use html2canvas to capture the InvoicePrint component
// and then put it into a PDF.

export const generateInvoice = async (data: any) => {
  const invoiceElement = document.getElementById("invoice-print");
  if (!invoiceElement) {
    console.error("Invoice element not found for PDF generation");
    return;
  }

  try {
    // Temporarily show the invoice for capturing if it's hidden
    const originalStyle = invoiceElement.style.display;
    const originalClassName = invoiceElement.className;
    
    // Force visibility for capture
    invoiceElement.classList.remove("hidden");
    invoiceElement.classList.add("block");
    invoiceElement.style.position = "absolute";
    invoiceElement.style.left = "-9999px";
    invoiceElement.style.top = "0";

    const canvas = await html2canvas(invoiceElement, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794, // A4 width in pixels approx at 96dpi is 794
    });

    // Restore original state
    invoiceElement.className = originalClassName;
    invoiceElement.style.display = originalStyle;
    invoiceElement.style.position = "";
    invoiceElement.style.left = "";
    invoiceElement.style.top = "";

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Invoice_${data.invoiceNumber || `INV-${data.id.toString().padStart(3, '0')}`}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    // Fallback to basic jsPDF if html2canvas fails
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Kisan Hitech Nursery", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text("Kalloli - 591 224", 105, 28, { align: "center" });
    doc.text(`Invoice No: K${data.id}`, 140, 50);
    doc.text(`Date: ${format(new Date(), "dd/MM/yyyy")}`, 140, 56);
    doc.save(`Invoice_Fallback_K${data.id}.pdf`);
  }
};
