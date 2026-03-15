import { useState } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Attendance, Employee } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, User, CheckCircle2, XCircle, MinusCircle, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PRESENT:  { label: "Present",  color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ABSENT:   { label: "Absent",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",             icon: <XCircle className="w-3.5 h-3.5" /> },
  HALF_DAY: { label: "Half Day", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <MinusCircle className="w-3.5 h-3.5" /> },
};

function formatTime(t: string | null | undefined) {
  if (!t || t === "-") return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function calcHours(inTime: string | null | undefined, outTime: string | null | undefined, stdHours: number) {
  if (!inTime || !outTime || inTime === "-" || outTime === "-" || inTime === outTime) return null;
  const [inH, inM] = inTime.split(":").map(Number);
  const [outH, outM] = outTime.split(":").map(Number);
  const mins = (outH * 60 + outM) - (inH * 60 + inM);
  if (mins < 30) return stdHours;
  return +(mins / 60).toFixed(2);
}

export default function EmployeeAttendanceReportPage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "">("");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: employees, isLoading: empLoading } = useEmployees();

  const monthStr   = format(selectedDate, "yyyy-MM");
  const startDate  = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const endDate    = format(endOfMonth(selectedDate), "yyyy-MM-dd");
  const monthLabel = format(selectedDate, "MMMM yyyy");

  const { data: attendanceRecords, isLoading: attLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/employees", selectedEmployeeId, "attendance", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/employees/${selectedEmployeeId}/attendance?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
    enabled: !!selectedEmployeeId,
  });

  const selectedEmployee = employees?.find((e) => e.id === selectedEmployeeId) as Employee | undefined;
  const stdHours = parseFloat((selectedEmployee as any)?.workHours || "8");

  const allDays = eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) });

  const recordsByDate = new Map<string, Attendance>();
  for (const r of attendanceRecords || []) recordsByDate.set(r.date, r);

  const rows = allDays.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const record  = recordsByDate.get(dateStr);
    const dayName = format(day, "EEE");
    const isSunday = format(day, "i") === "7";
    return { day, dateStr, dayName, isSunday, record };
  });

  const presentCount = rows.filter((r) => r.record?.status === "PRESENT").length;
  const absentCount  = rows.filter((r) => !r.record || r.record.status === "ABSENT").length;
  const halfDayCount = rows.filter((r) => r.record?.status === "HALF_DAY").length;
  const totalHours   = rows.reduce((acc, r) => {
    if (!r.record) return acc;
    if (r.record.status === "HALF_DAY") return acc + stdHours / 2;
    if (r.record.status !== "PRESENT")  return acc;
    const h = calcHours(r.record.inTime, r.record.outTime, stdHours);
    return acc + (h ?? stdHours);
  }, 0);

  const hoursLabel = totalHours % 1 === 0 ? totalHours.toFixed(0) : totalHours.toFixed(2);
  const hasData = !!selectedEmployeeId && !attLoading;

  // ── PDF Export ──────────────────────────────────────────────────────────────
  function exportPDF() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Kisan Hi-Tech Nursery", 105, 14, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Kalloli, Tq: Mudalagi, Dist: Belagavi  |  Ph: 7348998635 / 9663777255", 105, 20, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Monthly Attendance Report", 105, 28, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Employee : ${selectedEmployee?.name ?? ""}`, 14, 36);
    doc.text(`Month    : ${monthLabel}`, 14, 42);
    doc.text(`Present  : ${presentCount}   Absent : ${absentCount}   Half Day : ${halfDayCount}   Total Hours : ${hoursLabel} hrs`, 14, 48);

    const tableRows = rows.map((r, idx) => {
      const status = r.record?.status;
      const hours  = status === "HALF_DAY"
        ? (stdHours / 2).toFixed(2)
        : status === "PRESENT"
          ? (calcHours(r.record?.inTime, r.record?.outTime, stdHours) ?? stdHours).toFixed(2)
          : "—";
      return [
        idx + 1,
        format(r.day, "dd MMM yyyy"),
        r.dayName,
        status ? STATUS_CONFIG[status]?.label : "No Record",
        status === "PRESENT" ? formatTime(r.record?.inTime)  : "—",
        status === "PRESENT" ? formatTime(r.record?.outTime) : "—",
        status === "PRESENT" || status === "HALF_DAY" ? `${hours} hrs` : "—",
        r.record?.remarks || "—",
      ];
    });

    autoTable(doc, {
      startY: 53,
      head: [["#", "Date", "Day", "Status", "In Time", "Out Time", "Hours", "Remarks"]],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
      },
      didParseCell(data) {
        if (data.section === "body") {
          const status = rows[data.row.index]?.record?.status;
          if (status === "PRESENT")       data.cell.styles.fillColor = [240, 255, 240];
          else if (status === "ABSENT")   data.cell.styles.fillColor = [255, 240, 240];
          else if (status === "HALF_DAY") data.cell.styles.fillColor = [255, 253, 220];
        }
      },
    });

    const filename = `attendance_${selectedEmployee?.name?.replace(/\s+/g, "_")}_${monthStr}.pdf`;
    doc.save(filename);
  }

  // ── Excel Export ─────────────────────────────────────────────────────────────
  function exportExcel() {
    const wb = XLSX.utils.book_new();

    const header = [
      ["Kisan Hi-Tech Nursery"],
      ["Kalloli, Tq: Mudalagi, Dist: Belagavi | Ph: 7348998635 / 9663777255"],
      ["Monthly Attendance Report"],
      [],
      ["Employee", selectedEmployee?.name ?? ""],
      ["Month", monthLabel],
      ["Present", presentCount, "Absent", absentCount, "Half Day", halfDayCount, "Total Hours", `${hoursLabel} hrs`],
      [],
      ["#", "Date", "Day", "Status", "In Time", "Out Time", "Hours", "Remarks"],
    ];

    const dataRows = rows.map((r, idx) => {
      const status = r.record?.status;
      const hours  = status === "HALF_DAY"
        ? (stdHours / 2).toFixed(2)
        : status === "PRESENT"
          ? (calcHours(r.record?.inTime, r.record?.outTime, stdHours) ?? stdHours).toFixed(2)
          : "";
      return [
        idx + 1,
        format(r.day, "dd MMM yyyy"),
        r.dayName,
        status ? STATUS_CONFIG[status]?.label : "No Record",
        status === "PRESENT" ? formatTime(r.record?.inTime)  : "",
        status === "PRESENT" ? formatTime(r.record?.outTime) : "",
        status === "PRESENT" || status === "HALF_DAY" ? `${hours} hrs` : "",
        r.record?.remarks || "",
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([...header, ...dataRows]);

    ws["!cols"] = [
      { wch: 4 }, { wch: 16 }, { wch: 6 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const filename = `attendance_${selectedEmployee?.name?.replace(/\s+/g, "_")}_${monthStr}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Attendance Report</h1>
          <p className="text-sm text-muted-foreground mt-1">View daily in/out times for any employee for the selected month.</p>
        </div>
        {hasData && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportPDF}
              data-testid="button-export-pdf"
              className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportExcel}
              data-testid="button-export-excel"
              className="flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            className="flex-1 h-10 rounded-lg border border-muted-foreground/20 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : "")}
            data-testid="select-employee"
          >
            <option value="">-- Select Employee --</option>
            {employees?.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="month"
            value={monthStr}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-");
              setSelectedDate(new Date(+y, +m - 1, 1));
            }}
            className="h-10 rounded-lg border border-muted-foreground/20 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            data-testid="input-month"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {selectedEmployeeId && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Present",     value: presentCount,  cls: "text-green-600 dark:text-green-400" },
            { label: "Absent",      value: absentCount,   cls: "text-red-600 dark:text-red-400" },
            { label: "Half Day",    value: halfDayCount,  cls: "text-yellow-600 dark:text-yellow-400" },
            { label: "Total Hours", value: `${hoursLabel} hrs`, cls: "text-primary" },
          ].map(({ label, value, cls }) => (
            <Card key={label} className="border border-border/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
                <p className={`text-2xl font-black ${cls}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No employee selected */}
      {!selectedEmployeeId && (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <User className="w-10 h-10 opacity-30" />
            <p className="font-medium">Select an employee to view their attendance</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {selectedEmployeeId && (empLoading || attLoading) && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Table — desktop */}
      {hasData && (
        <>
          <Card className="hidden md:block border border-border/60 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b px-6 py-4">
              <CardTitle className="text-base font-bold">
                {selectedEmployee?.name} — {monthLabel}
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-12">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Day</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">In Time</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Out Time</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Hours</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ day, dateStr, dayName, isSunday, record }, idx) => {
                    const status = record?.status;
                    const cfg    = status ? STATUS_CONFIG[status] : null;
                    const hours  = status === "HALF_DAY"
                      ? (stdHours / 2).toFixed(2)
                      : status === "PRESENT"
                        ? (calcHours(record?.inTime, record?.outTime, stdHours) ?? stdHours).toFixed(2)
                        : null;
                    return (
                      <tr
                        key={dateStr}
                        data-testid={`row-attendance-${dateStr}`}
                        className={`border-b transition-colors ${isSunday ? "bg-blue-50/50 dark:bg-blue-950/10" : "hover:bg-muted/30"} ${!record ? "opacity-60" : ""}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{format(day, "dd MMM yyyy")}</td>
                        <td className="px-4 py-3">
                          <span className={isSunday ? "text-blue-500 font-semibold" : "text-muted-foreground"}>{dayName}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {cfg ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                              {cfg.icon}{cfg.label}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No Record</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm">
                          {status === "PRESENT" ? formatTime(record?.inTime) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm">
                          {status === "PRESENT" ? formatTime(record?.outTime) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hours ? <span className="font-semibold text-primary">{hours} hrs</span> : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{record?.remarks || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            <div className="font-semibold text-sm text-muted-foreground px-1">
              {selectedEmployee?.name} — {monthLabel}
            </div>
            {rows.map(({ day, dateStr, dayName, isSunday, record }, idx) => {
              const status = record?.status;
              const cfg    = status ? STATUS_CONFIG[status] : null;
              const hours  = status === "HALF_DAY"
                ? (stdHours / 2).toFixed(2)
                : status === "PRESENT"
                  ? (calcHours(record?.inTime, record?.outTime, stdHours) ?? stdHours).toFixed(2)
                  : null;
              return (
                <Card
                  key={dateStr}
                  data-testid={`card-attendance-mobile-${dateStr}`}
                  className={`border ${isSunday ? "border-blue-200 dark:border-blue-800" : "border-border/60"} ${!record ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-base">{format(day, "dd MMM yyyy")}</p>
                        <p className={`text-xs font-medium ${isSunday ? "text-blue-500" : "text-muted-foreground"}`}>{dayName}</p>
                      </div>
                      {cfg ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs bg-muted px-2 py-1 rounded-full">No Record</span>
                      )}
                    </div>
                    {status === "PRESENT" && (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg px-2 py-2">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">In</p>
                          <p className="font-mono text-sm font-bold text-green-700 dark:text-green-400">{formatTime(record?.inTime)}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/20 rounded-lg px-2 py-2">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Out</p>
                          <p className="font-mono text-sm font-bold text-red-700 dark:text-red-400">{formatTime(record?.outTime)}</p>
                        </div>
                        <div className="bg-primary/5 rounded-lg px-2 py-2">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Hours</p>
                          <p className="font-bold text-sm text-primary">{hours ?? "—"}</p>
                        </div>
                      </div>
                    )}
                    {record?.remarks && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{record.remarks}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
