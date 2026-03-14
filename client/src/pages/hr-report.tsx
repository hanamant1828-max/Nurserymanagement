import { useState, useMemo, useRef } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Printer, FileDown, Loader2, BarChart3,
  PieChart as PieIcon, TrendingUp, Users,
  Search, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Attendance, EmployeeAdvance } from "@shared/schema";
import * as XLSX from "xlsx";

/* ─── colours ─────────────────────────────────────────── */
const C = {
  present: "#22c55e", halfDay: "#f59e0b", absent: "#ef4444",
  gross: "#3b82f6", net: "#8b5cf6", advance: "#f43f5e",
};
const PIE_PALETTE = ["#8b5cf6","#f43f5e","#22c55e","#3b82f6","#f59e0b","#06b6d4","#ec4899"];

/* ─── tooltip helpers ──────────────────────────────────── */
const AttTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-xl shadow-lg px-4 py-3 text-sm min-w-[140px]">
      <p className="font-bold mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 text-xs" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold ml-auto">{p.value}</span>
        </p>
      ))}
    </div>
  );
};
const SalTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-xl shadow-lg px-4 py-3 text-sm min-w-[160px]">
      <p className="font-bold mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 text-xs" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold ml-auto">₹{Number(p.value).toLocaleString("en-IN")}</span>
        </p>
      ))}
    </div>
  );
};

/* ─── sort icon helper ─────────────────────────────────── */
type SortKey = "name" | "present" | "halfDay" | "absent" | "attendanceRate" | "grossSalary" | "advanceTaken" | "netPayable";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 text-primary" />
    : <ArrowDown className="w-3 h-3 text-primary" />;
}

/* ─── main component ───────────────────────────────────── */
export default function HrReportPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: employees, isLoading: empLoading } = useEmployees();
  const monthStr  = format(selectedDate, "yyyy-MM");
  const startDate = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const endDate   = format(endOfMonth(selectedDate),   "yyyy-MM-dd");

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
    for (const adv of advances)
      map[adv.employeeId] = (map[adv.employeeId] || 0) + parseFloat(adv.amount || "0");
    return map;
  }, [advances]);

  /* ── build rows ── */
  const reportRows = useMemo(() => {
    if (!employees) return [];
    return employees.map(emp => {
      const empAtt   = allAttendance.filter(a => a.employeeId === emp.id);
      const present  = empAtt.filter(a => a.status === "PRESENT").length;
      const halfDay  = empAtt.filter(a => a.status === "HALF_DAY").length;
      const absent   = daysInMonth - present - halfDay;
      const stdHours = parseFloat((emp as any).workHours || "8");

      let totalHours = 0;
      for (const rec of empAtt) {
        if (rec.status === "HALF_DAY") { totalHours += stdHours / 2; continue; }
        if (rec.status !== "PRESENT") continue;
        if (rec.inTime && rec.outTime && rec.inTime !== rec.outTime) {
          const [inH, inM]   = rec.inTime.split(":").map(Number);
          const [outH, outM] = rec.outTime.split(":").map(Number);
          const worked = (outH * 60 + outM) - (inH * 60 + inM);
          if (worked >= 30) totalHours += Math.min(worked / 60, stdHours);
          else totalHours += stdHours;
        } else {
          totalHours += stdHours;
        }
      }

      const dailyRate   = parseFloat(emp.salary || "0");
      const hourlyRate  = parseFloat((emp as any).hourlyRate || "0");
      const isHourly    = hourlyRate > 0;
      const totalDays   = totalHours / stdHours;
      const grossSalary = Math.round(isHourly ? hourlyRate * totalHours : dailyRate * totalDays);
      const advanceTaken = Math.round(advanceByEmployee[emp.id] || 0);
      const netPayable  = grossSalary - advanceTaken;
      const attendanceRate = daysInMonth > 0
        ? Math.round(((present + halfDay * 0.5) / daysInMonth) * 100) : 0;

      return {
        id: emp.id,
        name: emp.name,
        shortName: emp.name.length > 9 ? emp.name.slice(0, 9) + "…" : emp.name,
        designation: emp.designation,
        present, halfDay, absent,
        totalDays: parseFloat(totalDays.toFixed(2)),
        totalHours: parseFloat(totalHours.toFixed(2)),
        rate: isHourly ? hourlyRate : dailyRate,
        rateLabel: isHourly ? "/hr" : "/day",
        isHourly, grossSalary, advanceTaken, netPayable, attendanceRate,
      };
    });
  }, [employees, allAttendance, advances, daysInMonth, advanceByEmployee]);

  /* ── filtered + sorted rows (for Report tab) ── */
  const displayRows = useMemo(() => {
    let rows = reportRows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return rows;
  }, [reportRows, search, sortKey, sortDir]);

  const totals = useMemo(() => ({
    present:  displayRows.reduce((s, r) => s + r.present,  0),
    halfDay:  displayRows.reduce((s, r) => s + r.halfDay,  0),
    gross:    displayRows.reduce((s, r) => s + r.grossSalary, 0),
    advance:  displayRows.reduce((s, r) => s + r.advanceTaken, 0),
    net:      displayRows.reduce((s, r) => s + r.netPayable, 0),
  }), [displayRows]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  /* ── chart data ── */
  const attChartData  = reportRows.map(r => ({ name: r.shortName, "Present": r.present, "Half Day": r.halfDay, "Absent": r.absent }));
  const salChartData  = reportRows.map(r => ({ name: r.shortName, "Gross ₹": r.grossSalary, "Net ₹": r.netPayable, "Advance ₹": r.advanceTaken }));
  const rateChartData = reportRows.map(r => ({ name: r.shortName, "Attendance %": r.attendanceRate }));
  const payoutDonut   = [
    { name: "Net Payable", value: totals.net    > 0 ? totals.net    : 0 },
    { name: "Advance",     value: totals.advance > 0 ? totals.advance : 0 },
  ].filter(d => d.value > 0);
  const designationData = useMemo(() => {
    const map: Record<string, number> = {};
    reportRows.forEach(r => { map[r.designation] = (map[r.designation] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reportRows]);

  /* ── actions ── */
  const handlePrint = () => window.print();
  const handleExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [`Kisan Hi-Tech Nursery — HR Report — ${format(selectedDate, "MMMM yyyy")}`],
      [],
      ["#","Employee","Designation","Present","Half Day","Absent","Worked","Rate","Gross (₹)","Advance (₹)","Net (₹)"],
      ...displayRows.map((r, i) => [
        i+1, r.name, r.designation, r.present, r.halfDay, r.absent,
        r.isHourly ? `${r.totalHours} hrs` : `${r.totalDays} days`,
        `₹${r.rate.toLocaleString("en-IN")}${r.rateLabel}`,
        r.grossSalary, r.advanceTaken, r.netPayable,
      ]),
      [],
      ["","","","","","","","TOTAL", totals.gross, totals.advance, totals.net],
    ]);
    ws["!cols"] = [{wch:4},{wch:22},{wch:18},{wch:8},{wch:9},{wch:8},{wch:12},{wch:12},{wch:14},{wch:14},{wch:14}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HR Report");
    XLSX.writeFile(wb, `HR_Report_${monthStr}.xlsx`);
  };

  const fmt  = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ─────────────────── JSX ─────────────────── */
  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #hr-report-printable { display: block !important; position: fixed; top:0; left:0; width:100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6 px-4 md:px-8 py-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HR Report</h1>
            <p className="text-sm text-muted-foreground mt-1">Monthly attendance, salary & advance analytics.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap no-print">
            <input
              type="month"
              value={monthStr}
              onChange={e => {
                const [y, m] = e.target.value.split("-");
                setSelectedDate(new Date(parseInt(y), parseInt(m) - 1, 1));
              }}
              className="px-3 py-2 rounded-lg border border-muted-foreground/20 bg-background text-sm h-10"
              data-testid="input-month-picker"
            />
            <Button variant="outline" onClick={handleExcel} className="h-10 gap-2">
              <FileDown className="w-4 h-4" /> Excel
            </Button>
            <Button onClick={handlePrint} className="h-10 gap-2 bg-green-600 hover:bg-green-700">
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{reportRows.length}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-semibold uppercase tracking-wider">Employees</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">₹{(totals.gross/1000).toFixed(1)}K</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold uppercase tracking-wider">Gross Salary</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-950/30 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">₹{(totals.advance/1000).toFixed(1)}K</div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold uppercase tracking-wider">Total Advance</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">₹{(totals.net/1000).toFixed(1)}K</div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-semibold uppercase tracking-wider">Net Payable</p>
            </CardContent>
          </Card>
        </div>

        {/* ══════════ TABS ══════════ */}
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="h-11 rounded-xl bg-muted/50 p-1 no-print">
            <TabsTrigger value="analytics" className="rounded-lg gap-2 px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="report" className="rounded-lg gap-2 px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-report">
              <FileDown className="w-4 h-4" /> Report Table
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Analytics ── */}
          <TabsContent value="analytics" className="space-y-4 mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
              </div>
            ) : reportRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-2xl">
                <BarChart3 className="w-10 h-10 opacity-10 mb-2" />
                <p className="text-sm">No data for {format(selectedDate, "MMMM yyyy")}</p>
              </div>
            ) : (
              <>
                {/* Chart 1 — Attendance stacked bar */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2 pt-5 px-6">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Attendance Breakdown — {format(selectedDate, "MMMM yyyy")}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Present / Half Day / Absent per employee</p>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={attChartData} margin={{ top:4, right:24, left:0, bottom:4 }} barSize={22}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize:11, fill:"hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize:11, fill:"hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<AttTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }} />
                        <Bar dataKey="Present"  stackId="a" fill={C.present}  radius={[0,0,0,0]} />
                        <Bar dataKey="Half Day" stackId="a" fill={C.halfDay}  radius={[0,0,0,0]} />
                        <Bar dataKey="Absent"   stackId="a" fill={C.absent}   radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Chart 2 + Chart 3 side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <Card className="lg:col-span-3 border shadow-sm">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        Gross vs Net Payable
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Gross earned, net payable, and advance per employee</p>
                    </CardHeader>
                    <CardContent className="px-2 pb-4">
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={salChartData} margin={{ top:4, right:24, left:0, bottom:4 }} barSize={14} barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize:11, fill:"hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize:11, fill:"hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                            tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`} />
                          <Tooltip content={<SalTooltip />} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }} />
                          <Bar dataKey="Gross ₹"   fill={C.gross}   radius={[4,4,0,0]} />
                          <Bar dataKey="Net ₹"     fill={C.net}     radius={[4,4,0,0]} />
                          <Bar dataKey="Advance ₹" fill={C.advance} radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2 border shadow-sm">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <PieIcon className="w-4 h-4 text-purple-500" />
                        Payout Split
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Net payable vs advances this month</p>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pb-4">
                      {payoutDonut.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={170}>
                            <PieChart>
                              <Pie data={payoutDonut} cx="50%" cy="50%" innerRadius={52} outerRadius={76} paddingAngle={3} dataKey="value">
                                {payoutDonut.map((_, i) => (
                                  <Cell key={i} fill={i === 0 ? C.net : C.advance} stroke="none" />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, ""]} contentStyle={{ borderRadius:"12px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-col gap-1.5 w-full px-4">
                            {[["Net Payable", totals.net, C.net], ["Advance", totals.advance, C.advance]].map(([lbl, val, col]) => (
                              <div key={lbl as string} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full" style={{ background: col as string }} />
                                  {lbl}
                                </span>
                                <span className="font-bold">₹{(val as number).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No payout data</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Chart 4 — Attendance rate + Chart 5 — Team composition */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <Card className="lg:col-span-3 border shadow-sm">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        Attendance Rate %
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Percentage of days each employee was present</p>
                    </CardHeader>
                    <CardContent className="px-2 pb-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={rateChartData} margin={{ top:4, right:24, left:0, bottom:4 }} barSize={24}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize:11, fill:"hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0,100]} tick={{ fontSize:11, fill:"hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                          <Tooltip formatter={(v: any) => [`${v}%`, "Attendance"]} contentStyle={{ borderRadius:"12px" }} />
                          <Bar dataKey="Attendance %" radius={[4,4,0,0]}>
                            {rateChartData.map((entry, i) => (
                              <Cell key={i}
                                fill={entry["Attendance %"] >= 80 ? C.present : entry["Attendance %"] >= 50 ? C.halfDay : C.absent}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                        {[["bg-green-500","≥80% Good"],["bg-amber-500","50–79% Average"],["bg-red-500","<50% Poor"]].map(([cls,lbl])=>(
                          <span key={lbl} className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${cls}`} />{lbl}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2 border shadow-sm">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        Team by Role
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Employee count by designation</p>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pb-4">
                      <ResponsiveContainer width="100%" height={155}>
                        <PieChart>
                          <Pie data={designationData} cx="50%" cy="50%" outerRadius={62} dataKey="value"
                            label={({ value }) => value} labelLine={false}>
                            {designationData.map((_, i) => (
                              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius:"12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1 w-full px-4 mt-1 max-h-24 overflow-y-auto">
                        {designationData.map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                              <span className="truncate max-w-[120px]">{d.name}</span>
                            </span>
                            <span className="font-bold">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── TAB 2: Report Table ── */}
          <TabsContent value="report" className="space-y-4 mt-0">
            {/* Search + sort info bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or designation…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl"
                  data-testid="input-search-report"
                />
              </div>
              {search && (
                <Button variant="ghost" size="sm" className="h-10 text-muted-foreground" onClick={() => setSearch("")}>
                  Clear
                </Button>
              )}
              <p className="text-xs text-muted-foreground shrink-0">
                {displayRows.length} of {reportRows.length} employees
                {sortKey !== "name" && <span className="ml-1">• sorted by <span className="font-semibold capitalize">{sortKey.replace(/([A-Z])/g, " $1")}</span></span>}
              </p>
            </div>

            {/* Printable table */}
            <div id="hr-report-printable" ref={printRef} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              {/* Print header */}
              <div className="hidden print:block px-8 pt-8 pb-4 border-b text-center">
                <h2 className="text-2xl font-bold">Kisan Hi-Tech Nursery</h2>
                <p className="text-sm text-muted-foreground">Kalloli, Tq: Mudalagi, Dist: Belagavi</p>
                <p className="text-lg font-semibold mt-3">HR Monthly Report — {format(selectedDate, "MMMM yyyy")}</p>
                <p className="text-xs text-muted-foreground mt-1">{daysInMonth} days in month • Generated on {format(new Date(), "dd MMM yyyy")}</p>
              </div>

              {/* Screen sub-header */}
              <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between print:hidden">
                <div>
                  <p className="font-bold">{format(selectedDate, "MMMM yyyy")} — Employee Summary</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{daysInMonth} days • Click column headers to sort</p>
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
                        <th className="py-3 pl-6 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-8">#</th>
                        {([
                          ["name",           "Employee",    "text-left"],
                          [null,             "Designation", "text-left"],
                          ["present",        "Present",     "text-center"],
                          ["halfDay",        "Half Day",    "text-center"],
                          ["absent",         "Absent",      "text-center"],
                          ["attendanceRate", "Att %",       "text-center"],
                          [null,             "Worked",      "text-center"],
                          [null,             "Rate",        "text-right"],
                          ["grossSalary",    "Gross (₹)",   "text-right"],
                          ["advanceTaken",   "Advance (₹)", "text-right"],
                          ["netPayable",     "Net (₹)",     "text-right pr-6"],
                        ] as [SortKey | null, string, string][]).map(([key, label, align]) => (
                          <th key={label}
                            className={`py-3 px-2 font-bold text-xs uppercase tracking-wider text-muted-foreground ${align} ${key ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""}`}
                            onClick={() => key && handleSort(key)}
                          >
                            <span className="inline-flex items-center gap-1">
                              {label}
                              {key && <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {displayRows.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-20 text-center text-muted-foreground text-sm">
                            {search ? `No employees match "${search}"` : "No data for this month."}
                          </td>
                        </tr>
                      ) : (
                        displayRows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-muted/10 transition-colors" data-testid={`row-hr-report-${row.id}`}>
                            <td className="py-3.5 pl-6 text-xs text-muted-foreground">{idx + 1}</td>
                            <td className="py-3.5 px-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                  {row.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold">{row.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-2">
                              <Badge variant="secondary" className="text-xs font-normal">{row.designation}</Badge>
                            </td>
                            <td className="py-3.5 px-2 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 dark:bg-green-950/20 text-green-700 font-bold text-sm">
                                {row.present}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 text-center">
                              {row.halfDay > 0
                                ? <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 font-bold text-sm">{row.halfDay}</span>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="py-3.5 px-2 text-center">
                              {row.absent > 0
                                ? <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 font-bold text-sm">{row.absent}</span>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="py-3.5 px-2 text-center">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                row.attendanceRate >= 80 ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                                : row.attendanceRate >= 50 ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
                                : "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                              }`}>
                                {row.attendanceRate}%
                              </span>
                            </td>
                            <td className="py-3.5 px-2 text-center text-sm text-muted-foreground">
                              {row.isHourly
                                ? `${row.totalHours % 1 === 0 ? row.totalHours.toFixed(0) : row.totalHours.toFixed(1)} h`
                                : `${row.totalDays % 1 === 0 ? row.totalDays.toFixed(0) : row.totalDays.toFixed(1)} d`}
                            </td>
                            <td className="py-3.5 px-2 text-right text-xs text-muted-foreground">
                              ₹{row.rate.toLocaleString("en-IN")}{row.rateLabel}
                            </td>
                            <td className="py-3.5 px-2 text-right font-semibold text-green-700 dark:text-green-400">
                              ₹{fmt(row.grossSalary)}
                            </td>
                            <td className="py-3.5 px-2 text-right">
                              {row.advanceTaken > 0
                                ? <span className="font-semibold text-red-600 dark:text-red-400">₹{fmt(row.advanceTaken)}</span>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="py-3.5 pr-6 pl-2 text-right font-bold text-primary">
                              ₹{fmt(row.netPayable)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {displayRows.length > 0 && (
                      <tfoot>
                        <tr className="bg-muted/30 border-t-2">
                          <td colSpan={3} className="py-4 pl-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Total — {displayRows.length} employees
                          </td>
                          <td className="py-4 px-2 text-center font-bold text-green-700">{totals.present}</td>
                          <td className="py-4 px-2 text-center font-bold text-yellow-600">{totals.halfDay}</td>
                          <td colSpan={4} />
                          <td className="py-4 px-2 text-right font-bold text-green-700 dark:text-green-400">₹{fmt(totals.gross)}</td>
                          <td className="py-4 px-2 text-right font-bold text-red-600 dark:text-red-400">{totals.advance > 0 ? `₹${fmt(totals.advance)}` : "—"}</td>
                          <td className="py-4 pr-6 pl-2 text-right font-bold text-primary text-base">₹{fmt(totals.net)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Print signature footer */}
              <div className="hidden print:block px-8 py-6 border-t mt-4">
                <div className="grid grid-cols-3 gap-8 text-xs">
                  {["Prepared By","Checked By","Approved By"].map(l => (
                    <div key={l}><p className="font-bold mb-6">{l}</p><div className="border-t border-foreground pt-1">Signature</div></div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
