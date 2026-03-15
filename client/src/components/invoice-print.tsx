import { forwardRef } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Employee, Attendance } from "@shared/schema";

interface InvoicePrintProps {
  order?: any;
  employee?: Employee;
  attendance?: Attendance[];
  startDate?: string;
  endDate?: string;
  overriddenHours?: number;
  advanceTaken?: number;
}

export const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(({
  order,
  employee,
  attendance,
  startDate,
  endDate,
  overriddenHours,
  advanceTaken = 0,
}, ref) => {
  if (!order && !employee) return null;

  const today = format(new Date(), "dd/MM/yyyy");

  /* ─── SALARY SLIP ─────────────────────────────────────────────────── */
  if (employee) {
    const stdHours = parseFloat((employee as any).workHours || "8");
    const hourlyRate = parseFloat((employee as any).hourlyRate || "0");
    const isHourly = hourlyRate > 0;

    let autoHoursWorked = 0;
    for (const record of attendance || []) {
      if (record.status === "HALF_DAY") { autoHoursWorked += stdHours / 2; continue; }
      if (record.status !== "PRESENT") continue;
      if (record.inTime && record.outTime && record.inTime !== record.outTime) {
        const [inH, inM, inS = 0] = record.inTime.split(":").map(Number);
        const [outH, outM, outS = 0] = record.outTime.split(":").map(Number);
        const workedMinutes = (outH * 60 + outM + outS / 60) - (inH * 60 + inM + inS / 60);
        if (workedMinutes >= 30) {
          autoHoursWorked += isHourly ? workedMinutes / 60 : Math.min(workedMinutes / 60, stdHours);
        } else {
          autoHoursWorked += stdHours;
        }
      } else {
        autoHoursWorked += stdHours;
      }
    }

    const totalHoursWorked = overriddenHours !== undefined ? overriddenHours : autoHoursWorked;
    const presentDays = totalHoursWorked / stdHours;
    const dailyRate = parseFloat(employee.salary || "0");
    const effectiveRate = isHourly ? hourlyRate : dailyRate;
    const grossSalary = isHourly ? hourlyRate * totalHoursWorked : dailyRate * presentDays;
    const netPayable = Math.max(0, grossSalary - advanceTaken);
    const period = startDate && endDate
      ? `${format(new Date(startDate), "dd/MM/yyyy")} – ${format(new Date(endDate), "dd/MM/yyyy")}`
      : today;

    const workedLabel = isHourly
      ? `${totalHoursWorked % 1 === 0 ? totalHoursWorked.toFixed(0) : totalHoursWorked.toFixed(2)} hrs`
      : `${presentDays % 1 === 0 ? presentDays.toFixed(0) : presentDays.toFixed(2)} days`;
    const rateLabel = `₹${effectiveRate.toFixed(2)} / ${isHourly ? "hr" : "day"}`;

    return (
      <div
        ref={ref}
        id="invoice-print"
        style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", background: "white", color: "#111", fontFamily: "Arial, sans-serif" }}
      >
        {/* ── Letterhead ── */}
        <div style={{ background: "#1a5c3a", padding: "14px 28px 12px", color: "white" }}>
          {/* Blessing & Title – full width centered */}
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1px", opacity: 0.8 }}>|| ಶ್ರೀ ಆಂಜನೇಯ ಪ್ರಸನ್ನ ||</div>
            <div style={{ fontSize: "26px", fontWeight: 900, marginTop: "2px", letterSpacing: "0.5px" }}>ಕಿಸಾನ ಹೈಟೆಕ್ ನರ್ಸರಿ</div>
            <div style={{ fontSize: "11px", fontWeight: 600, marginTop: "2px", opacity: 0.9 }}>ಕಲ್ಲೋಳಿ – 591 224, ತಾ|| ಮೂಡಲಗಿ, ಜಿ|| ಬೆಳಗಾವಿ</div>
          </div>
          {/* Proprietor & Phones row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, opacity: 0.85 }}>ಪ್ರೋ: ಕುಂದನವರ ಬ್ರದರ್ಸ್</div>
            <div style={{ textAlign: "right", fontSize: "11px", fontWeight: 600, opacity: 0.85, lineHeight: "1.6" }}>
              <span>📞 9986589865 / 9663777255 / 7348998635</span>
            </div>
          </div>
        </div>

        {/* ── Document Title ── */}
        <div style={{ background: "#f0f7f2", borderBottom: "2px solid #1a5c3a", padding: "8px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "15px", fontWeight: 900, letterSpacing: "2px", color: "#1a5c3a" }}>SALARY SLIP</div>
          <div style={{ fontSize: "11px", color: "#555" }}>Date: <strong>{today}</strong></div>
        </div>

        <div style={{ padding: "20px 28px" }}>
          {/* ── Employee Info ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "18px", border: "1.5px solid #1a5c3a" }}>
            <tbody>
              <tr style={{ background: "#f0f7f2" }}>
                <td style={{ padding: "8px 12px", width: "30%", fontWeight: 700, fontSize: "12px", color: "#1a5c3a", borderRight: "1px solid #cde4d5" }}>ನೌಕರರ ಹೆಸರು (Name)</td>
                <td style={{ padding: "8px 12px", fontSize: "13px", fontWeight: 700, borderRight: "1.5px solid #1a5c3a" }}>{employee.name}</td>
                <td style={{ padding: "8px 12px", width: "22%", fontWeight: 700, fontSize: "12px", color: "#1a5c3a", borderRight: "1px solid #cde4d5" }}>ಅವಧಿ (Period)</td>
                <td style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 600 }}>{period}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: "12px", color: "#1a5c3a", borderRight: "1px solid #cde4d5", borderTop: "1px solid #cde4d5" }}>ಹುದ್ದೆ (Designation)</td>
                <td style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 600, borderRight: "1.5px solid #1a5c3a", borderTop: "1px solid #cde4d5" }}>{employee.designation}</td>
                <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: "12px", color: "#1a5c3a", borderRight: "1px solid #cde4d5", borderTop: "1px solid #cde4d5" }}>ವಿಧ (Type)</td>
                <td style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 600, borderTop: "1px solid #cde4d5" }}>{isHourly ? "Hourly (ತಾಸಿಗೆ)" : "Daily (ದಿನಕ್ಕೆ)"}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Earnings Table ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "18px", border: "1.5px solid #1a5c3a" }}>
            <thead>
              <tr style={{ background: "#1a5c3a", color: "white" }}>
                <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "12px", fontWeight: 700, width: "8%" }}>ಕ್ರ.ಸಂ</th>
                <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "12px", fontWeight: 700 }}>ವಿವರ (Description)</th>
                <th style={{ padding: "9px 12px", textAlign: "center", fontSize: "12px", fontWeight: 700, width: "18%" }}>ದಿನ / ಗಂಟೆ</th>
                <th style={{ padding: "9px 12px", textAlign: "center", fontSize: "12px", fontWeight: 700, width: "18%" }}>ದರ (Rate)</th>
                <th style={{ padding: "9px 12px", textAlign: "right", fontSize: "12px", fontWeight: 700, width: "20%" }}>ಮೊತ್ತ (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #cde4d5" }}>
                <td style={{ padding: "11px 12px", textAlign: "center", fontSize: "13px", borderRight: "1px solid #cde4d5" }}>1</td>
                <td style={{ padding: "11px 12px", fontSize: "13px", fontWeight: 600, borderRight: "1px solid #cde4d5" }}>
                  ಮಾಸಿಕ ವೇತನ (Basic Salary)
                </td>
                <td style={{ padding: "11px 12px", textAlign: "center", fontSize: "13px", fontWeight: 600, borderRight: "1px solid #cde4d5" }}>
                  {workedLabel}
                </td>
                <td style={{ padding: "11px 12px", textAlign: "center", fontSize: "13px", fontWeight: 600, borderRight: "1px solid #cde4d5" }}>
                  {rateLabel}
                </td>
                <td style={{ padding: "11px 12px", textAlign: "right", fontSize: "14px", fontWeight: 800 }}>
                  {grossSalary.toFixed(2)}
                </td>
              </tr>
              {advanceTaken > 0 && (
                <tr style={{ borderBottom: "1px solid #cde4d5", background: "#fff8f8" }}>
                  <td style={{ padding: "11px 12px", textAlign: "center", fontSize: "13px", borderRight: "1px solid #cde4d5" }}>2</td>
                  <td style={{ padding: "11px 12px", fontSize: "13px", fontWeight: 600, color: "#c00", borderRight: "1px solid #cde4d5" }}>
                    ಮುಂಗಡ ಕಡಿತ (Advance Deduction)
                  </td>
                  <td style={{ padding: "11px 12px", textAlign: "center", fontSize: "13px", color: "#999", borderRight: "1px solid #cde4d5" }}>—</td>
                  <td style={{ padding: "11px 12px", textAlign: "center", fontSize: "13px", color: "#999", borderRight: "1px solid #cde4d5" }}>—</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", fontSize: "14px", fontWeight: 800, color: "#c00" }}>
                    ({advanceTaken.toFixed(2)})
                  </td>
                </tr>
              )}
              {/* Blank filler rows for signature / notes space */}
              {[...Array(5)].map((_, i) => (
                <tr key={i} style={{ height: "36px", borderBottom: "1px solid #e8f0eb" }}>
                  <td style={{ borderRight: "1px solid #cde4d5" }}></td>
                  <td style={{ borderRight: "1px solid #cde4d5" }}></td>
                  <td style={{ borderRight: "1px solid #cde4d5" }}></td>
                  <td style={{ borderRight: "1px solid #cde4d5" }}></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Totals ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
            <table style={{ borderCollapse: "collapse", border: "1.5px solid #1a5c3a", minWidth: "260px" }}>
              <tbody>
                <tr style={{ background: "#f0f7f2" }}>
                  <td style={{ padding: "9px 14px", fontSize: "13px", fontWeight: 700, color: "#1a5c3a", borderBottom: "1px solid #cde4d5", borderRight: "1.5px solid #1a5c3a" }}>
                    ಒಟ್ಟು ವೇತನ (Gross Salary)
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "14px", fontWeight: 700, textAlign: "right", borderBottom: "1px solid #cde4d5", minWidth: "100px" }}>
                    ₹ {grossSalary.toFixed(2)}
                  </td>
                </tr>
                {advanceTaken > 0 && (
                  <tr style={{ background: "#fff8f8" }}>
                    <td style={{ padding: "9px 14px", fontSize: "13px", fontWeight: 700, color: "#c00", borderBottom: "1px solid #cde4d5", borderRight: "1.5px solid #1a5c3a" }}>
                      ಮುಂಗಡ ಕಡಿತ (Advance)
                    </td>
                    <td style={{ padding: "9px 14px", fontSize: "14px", fontWeight: 700, textAlign: "right", color: "#c00", borderBottom: "1px solid #cde4d5" }}>
                      − ₹ {advanceTaken.toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr style={{ background: "#1a5c3a" }}>
                  <td style={{ padding: "11px 14px", fontSize: "14px", fontWeight: 900, color: "white", borderRight: "1.5px solid white" }}>
                    ನಿವ್ವಳ ವೇತನ (Net Payable)
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "18px", fontWeight: 900, textAlign: "right", color: "white" }}>
                    ₹ {netPayable.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Signatures ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "40px", paddingTop: "16px", borderTop: "1px dashed #aaa" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#555", marginBottom: "40px" }}>ನೌಕರರ ಸಹಿ (Employee Signature)</div>
              <div style={{ borderTop: "1.5px solid #333", width: "130px", margin: "0 auto" }}></div>
              <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>{employee.name}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#555", marginBottom: "40px" }}>ಫಾರ್, ಕಿಸಾನ ಹೈಟೆಕ್ ನರ್ಸರಿ</div>
              <div style={{ borderTop: "1.5px solid #333", width: "130px", margin: "0 auto" }}></div>
              <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Authorised Signatory</div>
            </div>
          </div>

          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "9px", color: "#999", letterSpacing: "0.5px" }}>
            Computer generated salary slip • Kisan Hi-Tech Nursery, Kalloli
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            html, body { margin: 0; padding: 0; height: 0 !important; overflow: hidden !important; background: white !important; visibility: hidden; }
            #invoice-print {
              visibility: visible;
              position: fixed !important;
              top: 0; left: 0;
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              min-height: 297mm !important;
              background: white !important;
              display: block !important;
            }
            header, nav, aside, footer, .no-print, button, [role="button"], .sidebar, [data-radix-portal] { display: none !important; }
            @page { size: A4; margin: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}} />
      </div>
    );
  }

  /* ─── CUSTOMER ORDER INVOICE ──────────────────────────────────────── */
  const deliveryDate = order.deliveryDate
    ? format(new Date(order.deliveryDate), "dd/MM/yyyy")
    : today;

  return (
    <div
      ref={ref}
      id="invoice-print"
      style={{ width: "210mm", minHeight: "296mm", margin: "0 auto", background: "white", color: "#111", fontFamily: "Arial, sans-serif" }}
    >
      <div style={{ padding: "28px 32px" }}>
        {/* Header */}
        <div style={{ border: "2px solid #111", padding: "12px 16px", marginBottom: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: "12px", fontWeight: 700 }}>ಪ್ರೋ: ಕುಂದನವರ ಬ್ರದರ್ಸ್</div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "10px", fontWeight: 700 }}>|| ಶ್ರೀ ಆಂಜನೇಯ ಪ್ರಸನ್ನ ||</div>
              <div style={{ fontSize: "26px", fontWeight: 900, marginTop: "4px", color: "#1a4d3a" }}>ಕಿಸಾನ ಹೈಟೆಕ್ ನರ್ಸರಿ</div>
              <div style={{ fontSize: "12px", fontWeight: 700, marginTop: "2px" }}>ಕಲ್ಲೋಳಿ - 591 224</div>
            </div>
            <div style={{ textAlign: "right", fontSize: "12px", fontWeight: 700, lineHeight: "1.7" }}>
              <div>Mob: 9986589865</div>
              <div>9663777255</div>
              <div>7348998635</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 700, borderTop: "1px solid #111", paddingTop: "4px", marginTop: "12px" }}>
            <div>ತಾ|| ಮೂಡಲಗಿ</div>
            <div>ಜಿ|| ಬೆಳಗಾವಿ</div>
          </div>
        </div>

        {/* Customer & Invoice Details */}
        <div style={{ border: "2px solid #111", borderTop: "none", display: "grid", gridTemplateColumns: "1fr 200px", marginBottom: "14px" }}>
          <div style={{ padding: "12px", borderRight: "2px solid #111" }}>
            {[
              ["ಗ್ರಾಹಕರ ಹೆಸರು:", order.customerName],
              ["ಗ್ರಾಮ:", order.village],
              ["ಮೊಬೈಲ್ ಸಂಖ್ಯೆ:", order.phone],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap" }}>{label}</span>
                <span style={{ flex: 1, borderBottom: "1px dotted #999", fontSize: "13px", fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px" }}>
            {[
              ["ನಂ:", order.invoiceNumber || `INV-${String(order.id).padStart(3, "0")}`, "#c00"],
              ["ದಿನಾಂಕ:", deliveryDate, undefined],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap" }}>{label}</span>
                <span style={{ flex: 1, borderBottom: "1px dotted #999", fontSize: "13px", fontWeight: 700, color: color || "inherit" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #111", marginBottom: "14px" }}>
          <thead>
            <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #111" }}>
              {["ಅ. ಸಂ.", "ಸಸಿಗಳ ವಿವರ", "ನಗ", "ದರ", "ಮೊತ್ತ"].map((h, i) => (
                <th key={h} style={{ padding: "8px", fontSize: "13px", fontWeight: 700, textAlign: i === 1 ? "left" : "center", borderRight: i < 4 ? "2px solid #111" : undefined, width: i === 0 ? "48px" : i > 1 ? "80px" : undefined }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px 8px", textAlign: "center", fontSize: "13px", borderRight: "2px solid #111" }}>1</td>
              <td style={{ padding: "10px 8px", fontSize: "13px", fontWeight: 600, borderRight: "2px solid #111" }}>
                {order.lot?.variety?.name || "Plant Variety"}
              </td>
              <td style={{ padding: "10px 8px", textAlign: "center", fontSize: "13px", fontWeight: 600, borderRight: "2px solid #111" }}>
                {Number(order.bookedQty).toFixed(2)}
              </td>
              <td style={{ padding: "10px 8px", textAlign: "center", fontSize: "13px", fontWeight: 600, borderRight: "2px solid #111" }}>
                {Number(order.perUnitPrice).toFixed(2)}
              </td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontSize: "14px", fontWeight: 800 }}>
                {Number(order.totalAmount).toFixed(2)}
              </td>
            </tr>
            {[...Array(4)].map((_, i) => (
              <tr key={i} style={{ height: "32px", borderBottom: "1px solid #eee" }}>
                <td style={{ borderRight: "2px solid #111" }}></td>
                <td style={{ borderRight: "2px solid #111" }}></td>
                <td style={{ borderRight: "2px solid #111" }}></td>
                <td style={{ borderRight: "2px solid #111" }}></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer / Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "14px" }}>
          <div style={{ border: "2px solid #111", padding: "12px" }}>
            <div style={{ fontWeight: 700, fontSize: "13px" }}>G-Pay / Phone Pe</div>
            <div style={{ fontWeight: 900, fontSize: "20px", marginTop: "2px" }}>9986589865</div>
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#666" }}>Bank Details:</div>
              <div style={{ fontSize: "11px", fontWeight: 700, marginTop: "4px" }}>Kisan Hitech Nursery, Kalloli</div>
              <div style={{ fontSize: "11px" }}>A/c No. 918020082321165</div>
              <div style={{ fontSize: "11px" }}>IFSC: UTIB0000482 • Axis Bank, Gokak</div>
            </div>
          </div>
          <div style={{ border: "2px solid #111" }}>
            {[
              ["ಒಟ್ಟು :", Number(order.totalAmount).toFixed(2), false],
              ["ಮುಂಗಡ ಮೊತ್ತ :", Number(order.advanceAmount).toFixed(2), false],
              ["ಬಾಕಿ ಮೊತ್ತ :", Number(order.remainingBalance).toFixed(2), true],
            ].map(([label, val, bold]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1.5px solid #111", background: bold ? "#f9f9f9" : "white" }}>
                <span style={{ fontWeight: 700, fontSize: "13px" }}>{label}</span>
                <span style={{ fontWeight: bold ? 900 : 700, fontSize: bold ? "15px" : "13px", minWidth: "90px", textAlign: "right", borderBottom: bold ? "3px double #111" : undefined }}>{val}</span>
              </div>
            ))}
            <div style={{ padding: "8px 10px", fontSize: "11px", fontWeight: 700, color: "#555" }}>
              Vehicle: <span style={{ fontWeight: 500 }}>{order.vehicleDetails || "_________________"}</span>
            </div>
          </div>
        </div>

        {/* Terms & Signature */}
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "10px", maxWidth: "60%", lineHeight: "1.5", color: "#666" }}>
            ರೈತರು ಹೇಳಿದ ಸಸಿಗಳನ್ನು ತಯಾರಿಸಿ ಕೊಡಲಾಗುವುದು. ಆದರೆ ತಳಗಳಿಗೆ ಸಂಬಂಧಿಸಿದ ವ್ಯತ್ಯಾಸಗಳಿಗೆ ಮತ್ತು ಇಳುವರಿ, ರೋಗಬಾಧೆ, ಇತ್ಯಾದಿ ವಿಷಯಗಳಿಗೆ ನಾವು ಜವಾಬ್ದಾರರಲ್ಲ.
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "32px" }}>ಫಾರ್, ಕಿಸಾನ ಹೈಟೆಕ್ ನರ್ಸರಿ</div>
            <div style={{ borderTop: "1.5px solid #333", width: "120px", marginLeft: "auto" }}></div>
            <div style={{ fontSize: "11px", color: "#555", marginTop: "3px" }}>Authorised Signatory</div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body { margin: 0; padding: 0; height: 0 !important; overflow: hidden !important; background: white !important; visibility: hidden; }
          #invoice-print {
            visibility: visible;
            position: fixed !important;
            top: 0; left: 0;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            background: white !important;
            display: block !important;
          }
          header, nav, aside, footer, .no-print, button, [role="button"], .sidebar, [data-radix-portal] { display: none !important; }
          @page { size: A4; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />
    </div>
  );
});

InvoicePrint.displayName = "InvoicePrint";
