import { useState, useMemo, useRef } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, RadialBarChart, RadialBar
} from "recharts";
import { Printer, FileDown, Users, TrendingUp, TrendingDown, Wallet, Loader2, BarChart3, PieChart as PieIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Attendance, EmployeeAdvance } from "@shared/schema";
import * as XLSX from "xlsx";

const COLORS = {
  present: "#22c55e",
  halfDay: "#f59e0b",
  absent: "#ef4444",
  gross: "#3b82f6",
  net: "#8b5cf6",
  advance: "#f43f5e",
};

const PIE_COLORS = ["#8b5cf6", "#f43f5e", "#22c55e", "#3b82f6", "#f59e0b", "#06b6d4", "#ec4899"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold mb-2 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold ml-1">
            {typeof p.value === "number" && p.name?.toLowerCase().includes("₹")
              ? `₹${p.value.toLocaleString("en-IN")}`
              : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

const SalaryTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold mb-2 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold ml-1">₹{Number(p.value).toLocaleString("en-IN", { minimumFractionDigits: 0 })}</span>
        </p>
      ))}
    </div>
  );
};

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
      const attendanceRate = daysInMonth > 0 ? Math.round(((present + halfDay * 0.5) / daysInMonth) * 100) : 0;

      return {
        id: emp.id,
        name: emp.name,
        shortName: emp.name.length > 8 ? emp.name.slice(0, 8) + "…" : emp.name,
        designation: emp.designation,
        present,
        halfDay,
        absent,
        totalDays: parseFloat(totalDays.toFixed(2)),
        totalHours: parseFloat(totalHours.toFixed(2)),
        rate: isHourly ? hourlyRate : dailyRate,
        rateLabel: isHourly ? "/hr" : "/day",
        isHourly,
        grossSalary: Math.round(grossSalary),
        advanceTaken: Math.round(advanceTaken),
        netPayable: Math.round(netPayable),
        attendanceRate,
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

  // Chart data
  const attendanceChartData = reportRows.map(r => ({
    name: r.shortName,
    "Present": r.present,
    "Half Day": r.halfDay,
    "Absent": r.absent,
  }));

  const salaryChartData = reportRows.map(r => ({
    name: r.shortName,
    "Gross ₹": r.grossSalary,
    "Net ₹": r.netPayable,
    "Advance ₹": r.advanceTaken,
  }));

  const payoutDonutData = [
    { name: "Net Payable", value: totals.net > 0 ? totals.net : 0 },
    { name: "Advance", value: totals.advance > 0 ? totals.advance : 0 },
  ].filter(d => d.value > 0);

  const attendanceRateData = reportRows.map(r => ({
    name: r.shortName,
    "Attendance %": r.attendanceRate,
  }));

  const designationData = useMemo(() => {
    const map: Record<string, number> = {};
    reportRows.forEach(r => { map[r.designation] = (map[r.designation] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reportRows]);

  const handlePrint = () => window.print();

  const handleExcel = () => {
    const wsData = [
      [`Kisan Hi-Tech Nursery — HR Report — ${format(selectedDate, "MMMM yyyy")}`],
      [],
      ["#", "Employee", "Designation", "Present", "Half Day", "Absent", "Days/Hrs Worked", "Rate", "Gross Salary (₹)", "Advance (₹)", "Net Payable (₹)"],
      ...reportRows.map((r, i) => [
        i + 1, r.name, r.designation, r.present, r.halfDay, r.absent,
        r.isHourly ? `${r.totalHours} hrs` : `${r.totalDays} days`,
        `₹${r.rate.toLocaleString("en-IN")}${r.rateLabel}`,
        r.grossSalary, r.advanceTaken, r.netPayable,
      ]),
      [],
      ["", "", "", "", "", "", "", "TOTAL", totals.gross, totals.advance, totals.net],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 4 }, { wch: 22 }, { wch: 18 }, { wch: 8 }, { wch: 9 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HR Report");
    XLSX.writeFile(wb, `HR_Report_${monthStr}.xlsx`);
  };

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtK = (n: number) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #hr-report-printable { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6 px-4 md:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HR Report</h1>
            <p className="text-sm text-muted-foreground mt-1">Monthly employee attendance, salary & advance summary with analytics.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap no-print">
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

        {/* ── CHARTS SECTION ── */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : reportRows.length > 0 && (
          <div className="space-y-4 no-print">

            {/* Row 1: Attendance breakdown (full width stacked bar) */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2 pt-5 px-6">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Attendance Breakdown — {format(selectedDate, "MMMM yyyy")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Days present, half-day, and absent per employee</p>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={attendanceChartData} margin={{ top: 4, right: 24, left: 0, bottom: 4 }} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Present" stackId="a" fill={COLORS.present} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Half Day" stackId="a" fill={COLORS.halfDay} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Absent" stackId="a" fill={COLORS.absent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Row 2: Salary comparison + Payout donut */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Salary Comparison — grouped bar */}
              <Card className="lg:col-span-3 border shadow-sm">
                <CardHeader className="pb-2 pt-5 px-6">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Gross vs Net Payable
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Blue = Gross earned, Purple = Net after advance deduction</p>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={salaryChartData} margin={{ top: 4, right: 24, left: 0, bottom: 4 }} barSize={14} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}`} />
                      <Tooltip content={<SalaryTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Gross ₹" fill={COLORS.gross} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Net ₹" fill={COLORS.net} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Advance ₹" fill={COLORS.advance} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Payout split donut */}
              <Card className="lg:col-span-2 border shadow-sm">
                <CardHeader className="pb-2 pt-5 px-6">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-purple-500" />
                    Payout Split
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Net payable vs advances this month</p>
                </CardHeader>
                <CardContent className="flex flex-col items-center pb-4">
                  {payoutDonutData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={payoutDonutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {payoutDonutData.map((_, i) => (
                              <Cell key={i} fill={i === 0 ? COLORS.net : COLORS.advance} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1.5 w-full px-4 mt-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS.net }} />
                            Net Payable
                          </span>
                          <span className="font-bold text-purple-600">₹{totals.net.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS.advance }} />
                            Advance
                          </span>
                          <span className="font-bold text-red-500">₹{totals.advance.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                      <PieIcon className="w-8 h-8 opacity-20 mb-2" />
                      No payout data
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Row 3: Attendance rate bar + Team composition donut */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Attendance rate */}
              <Card className="lg:col-span-3 border shadow-sm">
                <CardHeader className="pb-2 pt-5 px-6">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Attendance Rate %
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Percentage of days each employee was present or half-day</p>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={attendanceRateData} margin={{ top: 4, right: 24, left: 0, bottom: 4 }} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(v: any) => [`${v}%`, "Attendance"]} labelStyle={{ fontWeight: "bold" }} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="Attendance %" radius={[4, 4, 0, 0]}>
                        {attendanceRateData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry["Attendance %"] >= 80 ? COLORS.present : entry["Attendance %"] >= 50 ? COLORS.halfDay : COLORS.absent}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> ≥80% Good</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 50-79% Average</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &lt;50% Poor</span>
                  </div>
                </CardContent>
              </Card>

              {/* Team composition by designation */}
              <Card className="lg:col-span-2 border shadow-sm">
                <CardHeader className="pb-2 pt-5 px-6">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Team by Role
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Employee count by designation</p>
                </CardHeader>
                <CardContent className="flex flex-col items-center pb-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={designationData}
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        dataKey="value"
                        label={({ name, value }) => `${value}`}
                        labelLine={false}
                      >
                        {designationData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, name: any) => [v, name]} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 w-full px-4 mt-1 max-h-24 overflow-y-auto">
                    {designationData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="truncate max-w-[120px]">{d.name}</span>
                        </span>
                        <span className="font-bold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── PRINTABLE REPORT TABLE ── */}
        <div id="hr-report-printable" ref={printRef} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="hidden print:block px-8 pt-8 pb-4 border-b">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Kisan Hi-Tech Nursery</h2>
              <p className="text-sm text-muted-foreground">Kalloli, Tq: Mudalagi, Dist: Belagavi</p>
              <p className="text-lg font-semibold mt-3">HR Monthly Report — {format(selectedDate, "MMMM yyyy")}</p>
              <p className="text-xs text-muted-foreground mt-1">{daysInMonth} days in month • Generated on {format(new Date(), "dd MMM yyyy")}</p>
            </div>
          </div>

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
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {row.name.charAt(0).toUpperCase()}
                            </div>
                            <p className="font-semibold text-sm">{row.name}</p>
                          </div>
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
                            <span className="font-semibold text-red-600 dark:text-red-400">₹{fmt(row.advanceTaken)}</span>
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

          <div className="hidden print:block px-8 py-6 border-t mt-4">
            <div className="grid grid-cols-3 gap-8 text-xs text-muted-foreground">
              <div><p className="font-bold mb-6">Prepared By</p><div className="border-t border-foreground pt-1">Signature</div></div>
              <div><p className="font-bold mb-6">Checked By</p><div className="border-t border-foreground pt-1">Signature</div></div>
              <div><p className="font-bold mb-6">Approved By</p><div className="border-t border-foreground pt-1">Signature</div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
