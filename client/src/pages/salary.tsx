import { useState, useMemo } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, FileText, Search, PlusCircle, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Attendance, Employee, EmployeeAdvance } from "@shared/schema";
import { InvoicePrint } from "@/components/invoice-print";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SalaryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [hoursOverrides, setHoursOverrides] = useState<Record<number, string>>({});
  const [advanceDialog, setAdvanceDialog] = useState<{ open: boolean; employeeId: number; employeeName: string } | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [advanceNote, setAdvanceNote] = useState("");
  const { toast } = useToast();
  const { data: employees, isLoading: employeesLoading } = useEmployees();

  const monthStr = format(selectedDate, "yyyy-MM");
  const startDate = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const endDate = format(endOfMonth(selectedDate), "yyyy-MM-dd");
  
  const { data: allAttendance, isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/range", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/range?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch attendance range");
      return res.json();
    }
  });

  const { data: advances = [] } = useQuery<EmployeeAdvance[]>({
    queryKey: ["/api/employee-advances", monthStr],
    queryFn: async () => {
      const res = await fetch(`/api/employee-advances?month=${monthStr}`);
      if (!res.ok) throw new Error("Failed to fetch advances");
      return res.json();
    }
  });

  const addAdvanceMutation = useMutation({
    mutationFn: async (data: { employeeId: number; amount: string; date: string; month: string; note?: string }) => {
      return apiRequest("POST", "/api/employee-advances", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-advances", monthStr] });
      setAdvanceDialog(null);
      setAdvanceAmount("");
      setAdvanceNote("");
      toast({ title: "Advance recorded successfully" });
    },
    onError: () => toast({ title: "Failed to record advance", variant: "destructive" }),
  });

  const deleteAdvanceMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/employee-advances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-advances", monthStr] });
      toast({ title: "Advance deleted" });
    },
    onError: () => toast({ title: "Failed to delete advance", variant: "destructive" }),
  });

  const advanceByEmployee = useMemo(() => {
    const map: Record<number, { total: number; records: EmployeeAdvance[] }> = {};
    for (const adv of advances) {
      if (!map[adv.employeeId]) map[adv.employeeId] = { total: 0, records: [] };
      map[adv.employeeId].total += parseFloat(adv.amount || "0");
      map[adv.employeeId].records.push(adv);
    }
    return map;
  }, [advances]);

  const salaryData = useMemo(() => {
    if (!employees || !allAttendance) return [];

    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate)
    }).length;

    return employees.map(employee => {
      const employeeAttendance = allAttendance.filter(a => a.employeeId === employee.id);
      const stdHours = parseFloat((employee as any).workHours || "8");

      let autoHoursWorked = 0;
      for (const record of employeeAttendance) {
        if (record.status === "HALF_DAY") {
          autoHoursWorked += stdHours / 2;
          continue;
        }
        if (record.status !== "PRESENT") continue;
        if (record.inTime && record.outTime && record.inTime !== record.outTime) {
          const [inH, inM, inS = 0] = record.inTime.split(":").map(Number);
          const [outH, outM, outS = 0] = record.outTime.split(":").map(Number);
          const inMinutes = inH * 60 + inM + inS / 60;
          const outMinutes = outH * 60 + outM + outS / 60;
          const workedMinutes = outMinutes - inMinutes;
          if (workedMinutes >= 30) {
            autoHoursWorked += Math.min(workedMinutes / 60, stdHours);
          } else {
            autoHoursWorked += stdHours;
          }
        } else {
          autoHoursWorked += stdHours;
        }
      }

      const overrideVal = hoursOverrides[employee.id];
      const totalHoursWorked = overrideVal !== undefined && overrideVal !== "" ? parseFloat(overrideVal) || 0 : autoHoursWorked;

      const totalDaysWorked = totalHoursWorked / stdHours;
      const dailyRate = parseFloat(employee.salary || "0");
      const hourlyRate = parseFloat((employee as any).hourlyRate || "0");
      const isHourly = hourlyRate > 0;
      const totalSalary = isHourly ? hourlyRate * totalHoursWorked : dailyRate * totalDaysWorked;

      const advanceTaken = advanceByEmployee[employee.id]?.total || 0;

      return {
        id: employee.id,
        name: employee.name,
        designation: employee.designation,
        dailyRate,
        hourlyRate,
        isHourly,
        presentDays: totalDaysWorked,
        daysInMonth,
        totalSalary,
        totalHoursWorked,
        autoHoursWorked,
        advanceTaken
      };
    });
  }, [employees, allAttendance, selectedDate, hoursOverrides, advanceByEmployee]);

  const filteredSalaryData = useMemo(() => {
    if (!search) return salaryData;
    const lower = search.toLowerCase();
    return salaryData.filter(item =>
      item.name.toLowerCase().includes(lower) ||
      item.designation.toLowerCase().includes(lower)
    );
  }, [salaryData, search]);

  const grandTotal = useMemo(() => {
    return filteredSalaryData.reduce((sum, item) => sum + item.totalSalary, 0);
  }, [filteredSalaryData]);

  const avgSalary = filteredSalaryData.length > 0 ? grandTotal / filteredSalaryData.length : 0;
  const avgAttendance = filteredSalaryData.length > 0 
    ? (filteredSalaryData.reduce((sum, item) => sum + item.presentDays, 0) / filteredSalaryData.length).toFixed(1)
    : 0;

  const daysInMonth = salaryData.length > 0 ? salaryData[0].daysInMonth : 0;

  if (employeesLoading || attendanceLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Salary Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Calculate and view monthly salaries based on daily wage attendance.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="month"
            value={monthStr}
            onChange={(e) => {
              const [year, month] = e.target.value.split("-");
              const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
              setSelectedDate(newDate);
            }}
            className="px-3 py-2 rounded-lg border border-muted-foreground/20 bg-background text-sm h-10 flex-1 sm:flex-none"
          />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{filteredSalaryData.length}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold uppercase tracking-wider">Employees</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">₹{(grandTotal / 100000).toFixed(1)}L</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold uppercase tracking-wider">Total Payout</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">₹{(avgSalary / 1000).toFixed(1)}K</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold uppercase tracking-wider">Avg Salary</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{avgAttendance} days</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-semibold uppercase tracking-wider">Avg Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Card */}
      <Card className="border shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Search</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Month Info Banner */}
      <div className="bg-muted/40 border border-muted rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{format(selectedDate, "MMMM yyyy")}</p>
          <p className="text-xs text-muted-foreground mt-1">{daysInMonth} days in month • Daily Wage Basis • No PF/ESI deductions</p>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Designation</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Rate</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">Days / Hours</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">Hours</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">Calculation</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Net Salary</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">Advance Taken</TableHead>
                <TableHead className="py-4 pr-6 font-bold text-xs uppercase tracking-wider text-center">Slip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalaryData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Users className="w-12 h-12 opacity-10" />
                      <p className="text-sm font-medium">No employees found</p>
                      {search && (
                        <Button
                          variant="ghost"
                          onClick={() => setSearch("")}
                          className="text-primary h-auto p-0"
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSalaryData.map((item) => (
                  <TableRow key={item.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6 py-4 font-bold text-sm">{item.name}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant="secondary" className="text-xs">{item.designation}</Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {item.isHourly ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-semibold text-primary">₹{item.hourlyRate.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">per hour</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-semibold text-primary">₹{item.dailyRate.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">per day</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      {item.isHourly ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-bold">
                          {item.totalHoursWorked % 1 === 0 ? item.totalHoursWorked.toFixed(0) : item.totalHoursWorked.toFixed(2)} hrs
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-bold">
                          {item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)}/{item.daysInMonth}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={hoursOverrides[item.id] !== undefined ? hoursOverrides[item.id] : (item.autoHoursWorked % 1 === 0 ? item.autoHoursWorked.toFixed(0) : item.autoHoursWorked.toFixed(2))}
                        onChange={(e) => setHoursOverrides(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val === "" || isNaN(parseFloat(val))) {
                            setHoursOverrides(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                          }
                        }}
                        className="w-20 text-center text-sm font-semibold border border-primary/30 rounded-lg px-2 py-1 bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                        data-testid={`input-hours-${item.id}`}
                      />
                    </TableCell>
                    <TableCell className="py-4 text-center text-xs font-mono text-muted-foreground bg-muted/20 rounded px-2 py-1">
                      {item.isHourly
                        ? `₹${item.hourlyRate.toLocaleString('en-IN')} × ${item.totalHoursWorked % 1 === 0 ? item.totalHoursWorked.toFixed(0) : item.totalHoursWorked.toFixed(2)} hrs`
                        : `₹${item.dailyRate.toLocaleString('en-IN')} × ${item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="py-4 text-right font-bold text-primary text-lg">₹{item.totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {item.advanceTaken > 0 ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-sm font-bold hover:bg-red-100 transition-colors cursor-pointer">
                                ₹{item.advanceTaken.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm rounded-2xl">
                              <DialogHeader>
                                <DialogTitle>Advances — {item.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2 mt-2">
                                {(advanceByEmployee[item.id]?.records || []).map(adv => (
                                  <div key={adv.id} className="flex items-center justify-between gap-2 bg-muted/30 rounded-lg px-3 py-2">
                                    <div>
                                      <p className="font-semibold text-sm">₹{parseFloat(adv.amount).toLocaleString('en-IN')}</p>
                                      <p className="text-xs text-muted-foreground">{adv.date}{adv.note ? ` • ${adv.note}` : ""}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteAdvanceMutation.mutate(adv.id)} disabled={deleteAdvanceMutation.isPending}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        <button
                          onClick={() => { setAdvanceDialog({ open: true, employeeId: item.id, employeeName: item.name }); setAdvanceDate(format(new Date(), "yyyy-MM-dd")); }}
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          data-testid={`button-add-advance-${item.id}`}
                        >
                          <PlusCircle className="w-3 h-3" /> Add
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
                            data-testid={`button-view-slip-${item.id}`}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Salary Slip — {item.name}</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            <InvoicePrint 
                              employee={{
                                id: item.id,
                                name: item.name,
                                designation: item.designation,
                                salary: item.dailyRate.toString()
                              } as Employee}
                              attendance={allAttendance?.filter(a => a.employeeId === item.id) || []}
                              startDate={startDate}
                              endDate={endDate}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {filteredSalaryData.length > 0 && (
              <TableFooter>
                <TableRow className="bg-primary/5 border-t-2">
                  <TableCell colSpan={7} className="pl-6 py-6 font-bold text-sm uppercase tracking-wider">Grand Total Monthly Payout</TableCell>
                  <TableCell className="py-6 text-right font-bold text-2xl text-primary">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="py-6"></TableCell>
                  <TableCell className="pr-6"></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>

      {/* Mobile / Tablet Card View */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredSalaryData.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl border-muted-foreground/10">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-5" />
            <p className="text-muted-foreground font-medium">No employees found</p>
          </div>
        ) : (
          filteredSalaryData.map((item) => (
            <div
              key={item.id}
              className="group relative bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
            >
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-base leading-tight">{item.name}</h3>
                    <Badge variant="secondary" className="mt-1 text-[10px]">{item.designation}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">{item.isHourly ? "Hour Rate" : "Day Rate"}</p>
                    <p className="font-bold text-sm text-primary">₹{(item.isHourly ? item.hourlyRate : item.dailyRate).toLocaleString('en-IN')}</p>
                  </div>
                  <div className={`${item.isHourly ? "bg-blue-50 dark:bg-blue-950/20" : "bg-green-50 dark:bg-green-950/20"} rounded-xl p-2.5 text-center`}>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">{item.isHourly ? "Hours" : "Days"}</p>
                    <p className={`font-bold text-sm ${item.isHourly ? "text-blue-600" : "text-green-600"}`}>
                      {item.isHourly
                        ? `${item.totalHoursWorked % 1 === 0 ? item.totalHoursWorked.toFixed(0) : item.totalHoursWorked.toFixed(2)} h`
                        : `${item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)}/${item.daysInMonth}`}
                    </p>
                  </div>
                  <div className="bg-primary/5 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Salary</p>
                    <p className="font-bold text-sm text-primary">₹{(item.totalSalary / 1000).toFixed(1)}K</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex-1">Hours (editable)</p>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={hoursOverrides[item.id] !== undefined ? hoursOverrides[item.id] : (item.autoHoursWorked % 1 === 0 ? item.autoHoursWorked.toFixed(0) : item.autoHoursWorked.toFixed(2))}
                    onChange={(e) => setHoursOverrides(prev => ({ ...prev, [item.id]: e.target.value }))}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val === "" || isNaN(parseFloat(val))) {
                        setHoursOverrides(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                      }
                    }}
                    className="w-20 text-center text-sm font-semibold border border-primary/30 rounded-lg px-2 py-1 bg-white dark:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    data-testid={`input-hours-mobile-${item.id}`}
                  />
                </div>

                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Calculation</p>
                  <p className="text-sm font-mono font-semibold">
                    {item.isHourly
                      ? `₹${item.hourlyRate.toLocaleString('en-IN')} × ${item.totalHoursWorked % 1 === 0 ? item.totalHoursWorked.toFixed(0) : item.totalHoursWorked.toFixed(2)} hrs`
                      : `₹${item.dailyRate.toLocaleString('en-IN')} × ${item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Net Salary</p>
                    <p className="font-bold text-primary text-lg">₹{item.totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 min-w-10 rounded-xl bg-primary/5 border-transparent text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-none"
                        data-testid={`button-view-slip-mobile-${item.id}`}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[90vw] max-w-[340px] rounded-2xl p-6">
                      <DialogHeader>
                        <DialogTitle className="text-lg">Salary Slip</DialogTitle>
                      </DialogHeader>
                      <div className="text-sm font-semibold text-foreground mt-2">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.designation}</div>
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>{item.isHourly ? "Hours Worked:" : "Days Worked:"}</span>
                          <span className="font-bold">
                            {item.isHourly
                              ? `${item.totalHoursWorked % 1 === 0 ? item.totalHoursWorked.toFixed(0) : item.totalHoursWorked.toFixed(2)} hrs`
                              : `${item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)}/${item.daysInMonth}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{item.isHourly ? "Hour Rate:" : "Daily Rate:"}</span>
                          <span className="font-bold">₹{(item.isHourly ? item.hourlyRate : item.dailyRate).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-bold">Total Salary:</span>
                          <span className="font-bold text-primary text-lg">₹{item.totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {item.advanceTaken > 0 && (
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-red-600 font-semibold">Advance Taken:</span>
                            <span className="font-bold text-red-600">₹{item.advanceTaken.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <button
                    onClick={() => { setAdvanceDialog({ open: true, employeeId: item.id, employeeName: item.name }); setAdvanceDate(format(new Date(), "yyyy-MM-dd")); }}
                    className="h-10 px-3 rounded-xl bg-red-50 border-transparent text-red-600 hover:bg-red-100 transition-all text-xs font-semibold flex items-center gap-1"
                    data-testid={`button-add-advance-mobile-${item.id}`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Advance
                    {item.advanceTaken > 0 && <span className="ml-1 font-bold">₹{item.advanceTaken.toLocaleString('en-IN')}</span>}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Summary */}
      {filteredSalaryData.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 lg:hidden">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Grand Total Monthly Payout</p>
              <p className="text-2xl font-bold text-primary mt-1">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-[10px] text-muted-foreground italic px-4">
        <p>Computer-generated salary report • Daily Wage Basis • No PF/ESI deductions</p>
      </div>

      {/* Add Advance Dialog */}
      {advanceDialog && (
        <Dialog open={advanceDialog.open} onOpenChange={(open) => { if (!open) setAdvanceDialog(null); }}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>Record Advance — {advanceDialog.employeeName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Amount (₹)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter advance amount"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  data-testid="input-advance-amount"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Date</label>
                <Input
                  type="date"
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  data-testid="input-advance-date"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Note (optional)</label>
                <Input
                  placeholder="e.g. Festival advance"
                  value={advanceNote}
                  onChange={(e) => setAdvanceNote(e.target.value)}
                  data-testid="input-advance-note"
                />
              </div>
              <Button
                className="w-full"
                disabled={!advanceAmount || parseFloat(advanceAmount) <= 0 || addAdvanceMutation.isPending}
                onClick={() => {
                  if (!advanceAmount || !advanceDate) return;
                  addAdvanceMutation.mutate({
                    employeeId: advanceDialog.employeeId,
                    amount: advanceAmount,
                    date: advanceDate,
                    month: monthStr,
                    note: advanceNote || undefined,
                  });
                }}
                data-testid="button-save-advance"
              >
                {addAdvanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Advance"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
