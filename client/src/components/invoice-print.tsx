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
    <div ref={ref} className="p-8 bg-white text-black font-sans print:p-4 print:m-0" style={{ width: "210mm", height: "297mm", margin: "auto", overflow: "hidden" }}>
      {/* Header */}
      <div className="border-2 border-black p-4 mb-4">
        <div className="flex justify-between items-start mb-2">
          <div className="text-sm font-bold">ಪ್ರೋ: ಕುಂದನವರ ಬ್ರದರ್ಸ್</div>
          <div className="text-center flex-1">
            <div className="text-xs font-bold">|| ಶ್ರೀ ಆಂಜನೇಯ ಪ್ರಸನ್ನ ||</div>
            <h1 className="text-3xl font-black mt-1">ಕಿಸಾನ ಹೈಟೆಕ್ ನರ್ಸರಿ</h1>
            <div className="text-sm font-bold mt-1">ಕಲ್ಲೋಳಿ - 591 224</div>
          </div>
          <div className="text-right text-sm font-bold">
            <div>Mob: 9986589865</div>
            <div>9663777255</div>
            <div>7348998635</div>
          </div>
        </div>
        
        <div className="flex justify-between text-sm font-bold border-t border-black pt-2 mt-2">
          <div>ತಾ|| ಮೂಡಲಗಿ</div>
          <div>ಜಿ|| ಬೆಳಗಾವಿ</div>
        </div>
      </div>

      {/* Customer Section */}
      <div className="border-2 border-black p-4 mb-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex border-b border-dotted border-black pb-1">
            <span className="font-bold min-w-[120px]">ಗ್ರಾಹಕರ ಹೆಸರು:</span>
            <span className="flex-1">{order.customerName}</span>
          </div>
          <div className="flex border-b border-dotted border-black pb-1">
            <span className="font-bold min-w-[120px]">ಗ್ರಾಮ:</span>
            <span className="flex-1">{order.village}</span>
          </div>
          <div className="flex border-b border-dotted border-black pb-1">
            <span className="font-bold min-w-[120px]">ಮೊಬೈಲ್ ಸಂಖ್ಯೆ:</span>
            <span className="flex-1">{order.phone}</span>
          </div>
        </div>
        <div className="space-y-2 border-l border-black pl-4">
          <div className="flex border-b border-dotted border-black pb-1">
            <span className="font-bold min-w-[80px]">ನಂ:</span>
            <span className="flex-1 text-red-600 font-bold">{order.invoiceNumber || `K${order.id}`}</span>
          </div>
          <div className="flex border-b border-dotted border-black pb-1">
            <span className="font-bold min-w-[80px]">ದಿನಾಂಕ:</span>
            <span className="flex-1">{deliveryDate}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse border-2 border-black mb-4">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="border-r border-black p-2 w-16 text-center">ಅ. ಸಂ.</th>
            <th className="border-r border-black p-2 text-left">ಸಸಿಗಳ ವಿವರ</th>
            <th className="border-r border-black p-2 w-24 text-center">ನಗ</th>
            <th className="border-r border-black p-2 w-24 text-center">ದರ</th>
            <th className="p-2 w-32 text-center">ಮೊತ್ತ</th>
          </tr>
        </thead>
        <tbody className="min-h-[400px]">
          <tr className="border-b border-black">
            <td className="border-r border-black p-2 text-center">1</td>
            <td className="border-r border-black p-2">{order.lot?.variety?.name || "Item Description"}</td>
            <td className="border-r border-black p-2 text-center">{order.bookedQty}</td>
            <td className="border-r border-black p-2 text-center">{order.perUnitPrice}</td>
            <td className="p-2 text-right">{order.totalAmount}</td>
          </tr>
          {/* Fill empty space */}
          <tr className="h-40">
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td></td>
          </tr>
        </tbody>
      </table>

      {/* Footer / Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border-2 border-black p-4 space-y-2">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-bold">G-Pay / Phone Pe</div>
              <div className="font-bold text-lg">9986589865</div>
            </div>
          </div>
          <div className="text-[10px] mt-4 space-y-1">
            <div className="font-bold">Bank Details:</div>
            <div>Kisan Hitech Nursery, Kalloli</div>
            <div>A/c No. 918020082321165</div>
            <div>IFSC: UTIB0000482, Axis Bank, Gokak</div>
          </div>
        </div>

        <div className="border-2 border-black">
          <div className="flex justify-between border-b border-black p-2">
            <span className="font-bold">ಒಟ್ಟು :</span>
            <span className="font-bold underline decoration-double">{order.totalAmount}</span>
          </div>
          <div className="flex justify-between border-b border-black p-2">
            <span className="font-bold">ಮುಂಗಡ ಮೊತ್ತ :</span>
            <span className="font-bold">{order.advanceAmount}</span>
          </div>
          <div className="flex justify-between border-b border-black p-2">
            <span className="font-bold">ಬಾಕಿ ಮೊತ್ತ :</span>
            <span className="font-bold underline decoration-double">{order.remainingBalance}</span>
          </div>
          <div className="p-2 text-xs">
             <div className="font-bold">Vehicle Details: {order.vehicleDetails || ""}</div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-end">
        <div className="text-[10px] max-w-[60%] leading-relaxed">
          ರೈತರು ಹೇಳಿದ ಸಸಿಗಳನ್ನು ತಯಾರಿಸಿ ಕೊಡಲಾಗುವುದು. ಆದರೆ ತಳಗಳಿಗೆ ಸಂಬಂಧಿಸಿದ ವ್ಯತ್ಯಾಸಗಳಿಗೆ ಮತ್ತು ಇಳುವರಿ, ರೋಗಬಾಧೆ, ಇತ್ಯಾದಿ ವಿಷಯಗಳಿಗೆ ನಾವು ಜವಾಬ್ದಾರರಲ್ಲ, ರೈತ ಬಾಂಧವರು ಸಹಕರಿಸಬೇಕಾಗಿ ಕೋರಿಕೆ.
        </div>
        <div className="text-right">
          <div className="font-bold mb-8">ಫಾರ್, ಕಿಸಾನ ಹೈಟೆಕ್ ನರ್ಸರಿ</div>
          <div className="font-bold">ಸಹಿ.</div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}} />
    </div>
  );
});

InvoicePrint.displayName = "InvoicePrint";
