import { useState, useMemo, useRef } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, FileDown, Users, IndianRupee, TrendingDown, Wallet, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Attendance, EmployeeAdvance } from "@shared/schema";
import * as XLSX from "xlsx";

export default function HrReportPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const printRef = useRef<HTMLDivElement>(null);

  const { data: employees, isLoading: empLoading } = useEmployees();

  const monthStr = format(selectedDate, "yyyy-MM");
  const startDate = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const endDate = format(endOfMonth(selectedDate), "yyyy-MM-dd");

  const { data: allAttendance = [], isLoading: attLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/range", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/range?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });

  const { data: advances = [], isLoading: advLoading } = useQuery<EmployeeAdvance[]>({
    queryKey: ["/api/employee-advances", monthStr],
    queryFn: async () => {
      const res = await fetch(`/api/employee-advances?month=${monthStr}`);
      if (!res.ok) throw new Error("Failed to fetch advances");
      return res.json();
    },
  });

  const isLoading = empLoading || attLoading || advLoading;

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(selectedDate),
    end: endOfMonth(selectedDate),
  }).length;

  const advanceByEmployee = useMemo(() => {
    const map: Record<number, number> = {};
    for (const adv of advances) {
      map[adv.employeeId] = (map[adv.employeeId] || 0) + parseFloat(adv.amount || "0");
    }
    return map;
  }, [advances]);

  const reportRows = useMemo(() => {
    if (!employees) return [];
    return employees.map((emp) => {
      const empAtt = allAttendance.filter((a) => a.employeeId === emp.id);
      const present = empAtt.filter((a) => a.status === "PRESENT").length;
      const halfDay = empAtt.filter((a) => a.status === "HALF_DAY").length;
      const absent = daysInMonth - present - halfDay;
      const stdHours = parseFloat((emp as any).workHours || "8");

      let totalHours = 0;
      for (const rec of empAtt) {
        if (rec.status === "HALF_DAY") { totalHours += stdHours / 2; continue; }
        if (rec.status !== "PRESENT") continue;
        if (rec.inTime && rec.outTime && rec.inTime !== rec.outTime) {
          const [inH, inM] = rec.inTime.split(":").map(Number);
          const [outH, outM] = rec.outTime.split(":").map(Number);
          const worked = (outH * 60 + outM) - (inH * 60 + inM);
          if (worked >= 30) totalHours += Math.min(worked / 60, stdHours);
          else totalHours += stdHours;
        } else {
          totalHours += stdHours;
        }
      }

      const dailyRate = parseFloat(emp.salary || "0");
      const hourlyRate = parseFloat((emp as any).hourlyRate || "0");
      const isHourly = hourlyRate > 0;
      const totalDays = totalHours / stdHours;
      const grossSalary = isHourly ? hourlyRate * totalHours : dailyRate * totalDays;
      const advanceTaken = advanceByEmployee[emp.id] || 0;
      const netPayable = grossSalary - advanceTaken;

      return {
        id: emp.id,
        name: emp.name,
        designation: emp.designation,
        present,
        halfDay,
        absent,
        totalDays: parseFloat(totalDays.toFixed(2)),
        totalHours: parseFloat(totalHours.toFixed(2)),
        rate: isHourly ? hourlyRate : dailyRate,
        rateLabel: isHourly ? "/hr" : "/day",
        isHourly,
        grossSalary,
        advanceTaken,
        netPayable,
      };
    });
  }, [employees, allAttendance, advances, daysInMonth, advanceByEmployee]);

  const totals = useMemo(() => ({
    present: reportRows.reduce((s, r) => s + r.present, 0),
    halfDay: reportRows.reduce((s, r) => s + r.halfDay, 0),
    gross: reportRows.reduce((s, r) => s + r.grossSalary, 0),
    advance: reportRows.reduce((s, r) => s + r.advanceTaken, 0),
    net: reportRows.reduce((s, r) => s + r.netPayable, 0),
  }), [reportRows]);

  const handlePrint = () => window.print();

  const handleExcel = () => {
    const wsData = [
      [`Kisan Hi-Tech Nursery — HR Report — ${format(selectedDate, "MMMM yyyy")}`],
      [],
      ["#", "Employee", "Designation", "Present", "Half Day", "Absent", "Days/Hrs Worked", "Rate", "Gross Salary (₹)", "Advance (₹)", "Net Payable (₹)"],
      ...reportRows.map((r, i) => [
        i + 1,
        r.name,
        r.designation,
        r.present,
        r.halfDay,
        r.absent,
        r.isHourly ? `${r.totalHours} hrs` : `${r.totalDays} days`,
        `₹${r.rate.toLocaleString("en-IN")}${r.rateLabel}`,
        r.grossSalary.toFixed(2),
        r.advanceTaken.toFixed(2),
        r.netPayable.toFixed(2),
      ]),
      [],
      ["", "", "", "", "", "", "", "TOTAL", totals.gross.toFixed(2), totals.advance.toFixed(2), totals.net.toFixed(2)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 4 }, { wch: 22 }, { wch: 18 }, { wch: 8 }, { wch: 9 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HR Report");
    XLSX.writeFile(wb, `HR_Report_${monthStr}.xlsx`);
  };

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      {/* Print styles injected inline */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #hr-report-printable { display: block !important; }
          #hr-report-printable { position: fixed; top: 0; left: 0; width: 100%; }
        }
        @media screen {
          #hr-report-printable { display: block; }
        }
      `}</style>

      <div className="space-y-6 px-4 md:px-8 py-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HR Report</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monthly employee attendance, salary & advance summary.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={monthStr}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-");
                setSelectedDate(new Date(parseInt(y), parseInt(m) - 1, 1));
              }}
              className="px-3 py-2 rounded-lg border border-muted-foreground/20 bg-background text-sm h-10"
            />
            <Button variant="outline" onClick={handleExcel} className="h-10 gap-2">
              <FileDown className="w-4 h-4" /> Excel
            </Button>
            <Button onClick={handlePrint} className="h-10 gap-2 bg-green-600 hover:bg-green-700">
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{reportRows.length}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-semibold uppercase tracking-wider">Employees</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">₹{(totals.gross / 1000).toFixed(1)}K</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold uppercase tracking-wider">Gross Salary</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-950/30 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">₹{(totals.advance / 1000).toFixed(1)}K</div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold uppercase tracking-wider">Total Advance</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">₹{(totals.net / 1000).toFixed(1)}K</div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-semibold uppercase tracking-wider">Net Payable</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Table */}
        <div id="hr-report-printable" ref={printRef} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          {/* Print Header — visible only when printing */}
          <div className="hidden print:block px-8 pt-8 pb-4 border-b">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Kisan Hi-Tech Nursery</h2>
              <p className="text-sm text-muted-foreground">Kalloli, Tq: Mudalagi, Dist: Belagavi</p>
              <p className="text-lg font-semibold mt-3">HR Monthly Report — {format(selectedDate, "MMMM yyyy")}</p>
              <p className="text-xs text-muted-foreground mt-1">{daysInMonth} days in month • Generated on {format(new Date(), "dd MMM yyyy")}</p>
            </div>
          </div>

          {/* Screen header row */}
          <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between print:hidden">
            <div>
              <p className="font-bold text-base">{format(selectedDate, "MMMM yyyy")} — Employee Summary</p>
              <p className="text-xs text-muted-foreground mt-0.5">{daysInMonth} working days in month • {reportRows.length} employees</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="py-3 pl-6 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground w-8">#</th>
                    <th className="py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Employee</th>
                    <th className="py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Designation</th>
                    <th className="py-3 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Present</th>
                    <th className="py-3 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Half Day</th>
                    <th className="py-3 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Absent</th>
                    <th className="py-3 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Worked</th>
                    <th className="py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Rate</th>
                    <th className="py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Gross (₹)</th>
                    <th className="py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Advance (₹)</th>
                    <th className="py-3 pr-6 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Net Payable (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-20 text-center text-muted-foreground text-sm">
                        No employee data found for this month.
                      </td>
                    </tr>
                  ) : (
                    reportRows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-muted/10 transition-colors" data-testid={`row-hr-report-${row.id}`}>
                        <td className="py-3.5 pl-6 text-xs text-muted-foreground font-medium">{idx + 1}</td>
                        <td className="py-3.5">
                          <p className="font-semibold text-sm">{row.name}</p>
                        </td>
                        <td className="py-3.5">
                          <Badge variant="secondary" className="text-xs font-normal">{row.designation}</Badge>
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 font-bold text-sm">
                            {row.present}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          {row.halfDay > 0 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300 font-bold text-sm">
                              {row.halfDay}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3.5 text-center">
                          {row.absent > 0 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-sm">
                              {row.absent}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3.5 text-center text-sm font-medium text-muted-foreground">
                          {row.isHourly
                            ? `${row.totalHours % 1 === 0 ? row.totalHours.toFixed(0) : row.totalHours.toFixed(1)} hrs`
                            : `${row.totalDays % 1 === 0 ? row.totalDays.toFixed(0) : row.totalDays.toFixed(1)} days`}
                        </td>
                        <td className="py-3.5 text-right text-xs text-muted-foreground font-medium">
                          ₹{row.rate.toLocaleString("en-IN")}{row.rateLabel}
                        </td>
                        <td className="py-3.5 text-right font-semibold text-green-700 dark:text-green-400">
                          ₹{fmt(row.grossSalary)}
                        </td>
                        <td className="py-3.5 text-right">
                          {row.advanceTaken > 0 ? (
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              ₹{fmt(row.advanceTaken)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3.5 pr-6 text-right font-bold text-base text-primary">
                          ₹{fmt(row.netPayable)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reportRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-muted/30 border-t-2 border-muted">
                      <td colSpan={3} className="py-4 pl-6 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                        Total — {reportRows.length} Employees
                      </td>
                      <td className="py-4 text-center font-bold text-green-700 dark:text-green-400">{totals.present}</td>
                      <td className="py-4 text-center font-bold text-yellow-700 dark:text-yellow-400">{totals.halfDay}</td>
                      <td />
                      <td />
                      <td />
                      <td className="py-4 text-right font-bold text-green-700 dark:text-green-400 text-base">
                        ₹{fmt(totals.gross)}
                      </td>
                      <td className="py-4 text-right font-bold text-red-600 dark:text-red-400 text-base">
                        {totals.advance > 0 ? `₹${fmt(totals.advance)}` : "—"}
                      </td>
                      <td className="py-4 pr-6 text-right font-bold text-primary text-lg">
                        ₹{fmt(totals.net)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Print footer */}
          <div className="hidden print:block px-8 py-6 border-t mt-4">
            <div className="grid grid-cols-3 gap-8 text-xs text-muted-foreground">
              <div>
                <p className="font-bold mb-6">Prepared By</p>
                <div className="border-t border-foreground pt-1">Signature</div>
              </div>
              <div>
                <p className="font-bold mb-6">Checked By</p>
                <div className="border-t border-foreground pt-1">Signature</div>
              </div>
              <div>
                <p className="font-bold mb-6">Approved By</p>
                <div className="border-t border-foreground pt-1">Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
