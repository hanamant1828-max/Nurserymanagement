import { forwardRef } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InvoicePrintProps {
  order: any;
}

export const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(({ order }, ref) => {
  if (!order) return null;

  const today = format(new Date(), "dd/MM/yyyy");
  const deliveryDate = order.deliveryDate ? format(new Date(order.deliveryDate), "dd/MM/yyyy") : today;

  return (
    <div ref={ref} id="invoice-print" className="p-0 bg-white text-black font-sans print:p-0 print:m-0 print:static" style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", overflow: "visible" }}>
      <div className="p-8">
        {/* Header */}
        <div className="border-2 border-black p-4 mb-0 relative">
          <div className="flex justify-between items-start">
            <div className="text-[12px] font-bold">ಪ್ರೋ: ಕುಂದನವರ ಬ್ರದರ್ಸ್</div>
            <div className="text-center flex-1">
              <div className="text-[10px] font-bold">|| ಶ್ರೀ ಆಂಜನೇಯ ಪ್ರಸನ್ನ ||</div>
              <h1 className="text-3xl font-black mt-1 text-[#1a4d3a]">ಕಿಸಾನ ಹೈಟೆಕ್ ನರ್ಸರಿ</h1>
              <div className="text-[12px] font-bold mt-1">ಕಲ್ಲೋಳಿ - 591 224</div>
            </div>
            <div className="text-right text-[12px] font-bold leading-tight">
              <div>Mob: 9986589865</div>
              <div className="mt-1">9663777255</div>
              <div className="mt-1">7348998635</div>
            </div>
          </div>
          
          <div className="flex justify-between text-[14px] font-bold border-t border-black pt-1 mt-4">
            <div>ತಾ|| ಮೂಡಲಗಿ</div>
            <div>ಜಿ|| ಬೆಳಗಾವಿ</div>
          </div>
        </div>

        {/* Customer & Invoice Details Section */}
        <div className="border-x-2 border-b-2 border-black grid grid-cols-[1fr_200px] mb-4">
          <div className="p-4 space-y-3 border-r-2 border-black">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-[14px] whitespace-nowrap">ಗ್ರಾಹಕರ ಹೆಸರು:</span>
              <span className="flex-1 border-b border-dotted border-black text-[14px] font-medium">{order.customerName}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-[14px] whitespace-nowrap">ಗ್ರಾಮ:</span>
              <span className="flex-1 border-b border-dotted border-black text-[14px] font-medium">{order.village}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-[14px] whitespace-nowrap">ಮೊಬೈಲ್ ಸಂಖ್ಯೆ:</span>
              <span className="flex-1 border-b border-dotted border-black text-[14px] font-medium">{order.phone}</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-[14px] whitespace-nowrap">ನಂ:</span>
              <span className="flex-1 border-b border-dotted border-black text-[14px] font-bold text-red-600">{order.invoiceNumber || `INV-${order.id.toString().padStart(3, '0')}`}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-[14px] whitespace-nowrap">ದಿನಾಂಕ:</span>
              <span className="flex-1 border-b border-dotted border-black text-[14px] font-medium">{deliveryDate}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border-2 border-black mb-4">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50/50">
              <th className="border-r-2 border-black p-2 w-16 text-center text-[14px] font-bold">ಅ. ಸಂ.</th>
              <th className="border-r-2 border-black p-2 text-left text-[14px] font-bold">ಸಸಿಗಳ ವಿವರ</th>
              <th className="border-r-2 border-black p-2 w-24 text-center text-[14px] font-bold">ನಗ</th>
              <th className="border-r-2 border-black p-2 w-24 text-center text-[14px] font-bold">ದರ</th>
              <th className="p-2 w-32 text-center text-[14px] font-bold">ಮೊತ್ತ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              <td className="border-r-2 border-black p-3 text-center text-[14px]">1</td>
              <td className="border-r-2 border-black p-3 text-[14px] font-medium">{order.lot?.variety?.name || "Plant Variety"}</td>
              <td className="border-r-2 border-black p-3 text-center text-[14px] font-medium">{Number(order.bookedQty).toFixed(2)}</td>
              <td className="border-r-2 border-black p-3 text-center text-[14px] font-medium">{Number(order.perUnitPrice).toFixed(2)}</td>
              <td className="p-3 text-right text-[14px] font-bold">{Number(order.totalAmount).toFixed(2)}</td>
            </tr>
            {/* Fill empty space with structured lines */}
            {[...Array(6)].map((_, i) => (
              <tr key={i} className="h-10 border-b border-black/10 last:border-b-0">
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td></td>
              </tr>
            ))}
            {/* Ensure minimum table height */}
            <tr className="h-20">
              <td className="border-r-2 border-black"></td>
              <td className="border-r-2 border-black"></td>
              <td className="border-r-2 border-black"></td>
              <td className="border-r-2 border-black"></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* Footer / Summary Grid */}
        <div className="grid grid-cols-[1.2fr_1fr] gap-4">
          {/* Payment & Bank Details */}
          <div className="border-2 border-black p-4 flex flex-col justify-between">
            <div>
              <div className="font-bold text-[16px]">G-Pay / Phone Pe</div>
              <div className="font-bold text-2xl mt-1">9986589865</div>
            </div>
            <div className="mt-6 space-y-1">
              <div className="font-bold text-[11px] uppercase tracking-wider text-gray-600">Bank Details:</div>
              <div className="text-[12px] font-bold">Kisan Hitech Nursery, Kalloli</div>
              <div className="text-[12px]">A/c No. 918020082321165</div>
              <div className="text-[12px]">IFSC: UTIB0000482, Axis Bank, Gokak</div>
            </div>
          </div>

          {/* Totals & Vehicle */}
          <div className="border-2 border-black divide-y-2 divide-black">
            <div className="flex justify-between items-center p-3">
              <span className="font-bold text-[15px]">ಒಟ್ಟು :</span>
              <span className="font-bold text-[18px] border-b-4 border-double border-black min-w-[100px] text-right">
                {Number(order.totalAmount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50/30">
              <span className="font-bold text-[15px]">ಮುಂಗಡ ಮೊತ್ತ :</span>
              <span className="font-bold text-[16px] min-w-[100px] text-right">
                {Number(order.advanceAmount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3">
              <span className="font-bold text-[15px]">ಬಾಕಿ ಮೊತ್ತ :</span>
              <span className="font-bold text-[18px] border-b-4 border-double border-black min-w-[100px] text-right">
                {Number(order.remainingBalance).toFixed(2)}
              </span>
            </div>
            <div className="p-3 text-[13px] font-bold text-gray-700">
               Vehicle Details: <span className="ml-1 font-medium">{order.vehicleDetails || "_________________"}</span>
            </div>
          </div>
        </div>

        {/* Terms & Signatures */}
        <div className="mt-10 flex justify-between items-end">
          <div className="text-[11px] max-w-[55%] leading-relaxed text-gray-600 font-medium">
            ರೈತರು ಹೇಳಿದ ಸಸಿಗಳನ್ನು ತಯಾರಿಸಿ ಕೊಡಲಾಗುವುದು. ಆದರೆ ತಳಗಳಿಗೆ ಸಂಬಂಧಿಸಿದ ವ್ಯತ್ಯಾಸಗಳಿಗೆ ಮತ್ತು ಇಳುವರಿ, ರೋಗಬಾಧೆ, ಇತ್ಯಾದಿ ವಿಷಯಗಳಿಗೆ ನಾವು ಜವಾಬ್ದಾರರಲ್ಲ, ರೈತ ಬಾಂಧವರು ಸಹಕರಿಸಬೇಕಾಗಿ ಕೋರಿಕೆ.
          </div>
          <div className="text-right pb-2">
            <div className="font-bold text-[15px] mb-12">ಫಾರ್, ಕಿಸಾನ ಹೈಟೆಕ್ ನರ್ಸರಿ</div>
            <div className="font-bold text-[15px] flex items-center justify-end gap-2">
              ಸಹಿ. <span className="inline-block w-20 border-b border-black"></span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { 
            margin: 0; 
            padding: 0;
            background: white !important;
          }
          #invoice-print { 
            position: fixed; 
            left: 0; 
            top: 0; 
            width: 210mm !important;
            height: 297mm !important;
            background: white !important;
            z-index: 9999;
          }
          header, nav, aside, footer, .no-print, button, [role="button"] { 
            display: none !important; 
          }
          @page {
            size: A4;
            margin: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
});

InvoicePrint.displayName = "InvoicePrint";
