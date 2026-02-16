import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Note: Kannada text requires custom font embedding in jsPDF.
// For browser printing, we use the HTML template in InvoicePrint component.
// This function remains for standard PDF downloads if needed, but the primary
// print functionality will be handled by the InvoicePrint component.

export const generateInvoice = (data: any) => {
  // Use window.print() on the InvoicePrint component for best Kannada support
  window.print();
};
