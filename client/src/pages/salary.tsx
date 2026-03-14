import { useState, useMemo } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, FileText, Search, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Attendance, Employee, EmployeeAdvance } from "@shared/schema";
import { InvoicePrint } from "@/components/invoice-print";

export default function SalaryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [hoursOverrides, setHoursOverrides] = useState<Record<number, string>>({});
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

  const advanceByEmployee = useMemo(() => {
    const map: Record<number, number> = {};
    for (const adv of advances) {
      map[adv.employeeId] = (map[adv.employeeId] || 0) + parseFloat(adv.amount || "0");
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
      const totalHoursWorked = overrideVal !== undefined && overrideVal !== ""
        ? parseFloat(overrideVal) || 0
        : autoHoursWorked;

      const totalDaysWorked = totalHoursWorked / stdHours;
      const dailyRate = parseFloat(employee.salary || "0");
      const hourlyRate = parseFloat((employee as any).hourlyRate || "0");
      const isHourly = hourlyRate > 0;
      const grossSalary = isHourly ? hourlyRate * totalHoursWorked : dailyRate * totalDaysWorked;
      const advanceTaken = advanceByEmployee[employee.id] || 0;
      const netPayable = Math.max(0, grossSalary - advanceTaken);

      return {
        id: employee.id,
        name: employee.name,
        designation: employee.designation,
        dailyRate,
        hourlyRate,
        isHourly,
        stdHours,
        presentDays: totalDaysWorked,
        daysInMonth,
        grossSalary,
        netPayable,
        totalHoursWorked,
        autoHoursWorked,
        advanceTaken,
        employeeAttendance,
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

  const totals = useMemo(() => {
    const gross = filteredSalaryData.reduce((s, i) => s + i.grossSalary, 0);
    const advances = filteredSalaryData.reduce((s, i) => s + i.advanceTaken, 0);
    const net = filteredSalaryData.reduce((s, i) => s + i.netPayable, 0);
    return { gross, advances, net };
  }, [filteredSalaryData]);

  const avgAttendance = filteredSalaryData.length > 0
    ? (filteredSalaryData.reduce((s, i) => s + i.presentDays, 0) / filteredSalaryData.length).toFixed(1)
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
          <p className="text-sm text-muted-foreground mt-1">Monthly salary calculation based on attendance. You can override hours manually.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="month"
            value={monthStr}
            onChange={(e) => {
              const [year, month] = e.target.value.split("-");
              const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
              setSelectedDate(newDate);
              setHoursOverrides({});
            }}
            className="px-3 py-2 rounded-lg border border-muted-foreground/20 bg-background text-sm h-10 flex-1 sm:flex-none"
            data-testid="input-month-picker"
          />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300" data-testid="stat-employee-count">{filteredSalaryData.length}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold uppercase tracking-wider">Employees</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/20 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-green-700 dark:text-green-300" data-testid="stat-gross-payout">₹{(totals.gross / 1000).toFixed(1)}K</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold uppercase tracking-wider">Gross Payout</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-950/30 dark:to-red-950/20 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-red-700 dark:text-red-300" data-testid="stat-total-advances">₹{(totals.advances / 1000).toFixed(1)}K</div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold uppercase tracking-wider">Total Advances</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-primary" data-testid="stat-net-payout">₹{(totals.net / 1000).toFixed(1)}K</div>
            <p className="text-xs text-primary/70 mt-2 font-semibold uppercase tracking-wider">Net Payable</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Month Banner */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Card className="border shadow-sm flex-1">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
                data-testid="input-search-employee"
              />
            </div>
          </CardContent>
        </Card>
        <div className="bg-muted/40 border border-muted rounded-xl px-5 py-3 flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{format(selectedDate, "MMMM yyyy")}</p>
            <p className="text-xs text-muted-foreground">{daysInMonth} days • Avg {avgAttendance} days/employee</p>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider">Employee</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Designation</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Rate</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">Attendance</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">
                  <span className="text-primary">Override Hrs</span>
                </TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">Calculation</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Gross Salary</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Advance</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Net Payable</TableHead>
                <TableHead className="py-4 pr-6 font-bold text-xs uppercase tracking-wider text-center">Slip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalaryData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Users className="w-12 h-12 opacity-10" />
                      <p className="text-sm font-medium">No employees found</p>
                      {search && (
                        <Button
                          variant="ghost"
                          onClick={() => setSearch("")}
                          className="text-primary h-auto p-0"
                          data-testid="button-clear-search"
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
                    <TableCell className="pl-6 py-4 font-bold text-sm" data-testid={`text-employee-name-${item.id}`}>{item.name}</TableCell>
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
                          {item.autoHoursWorked % 1 === 0 ? item.autoHoursWorked.toFixed(0) : item.autoHoursWorked.toFixed(2)} hrs
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-bold">
                          {(item.autoHoursWorked / item.stdHours) % 1 === 0
                            ? (item.autoHoursWorked / item.stdHours).toFixed(0)
                            : (item.autoHoursWorked / item.stdHours).toFixed(2)}/{item.daysInMonth} days
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder={item.autoHoursWorked % 1 === 0 ? item.autoHoursWorked.toFixed(0) : item.autoHoursWorked.toFixed(2)}
                        value={hoursOverrides[item.id] !== undefined ? hoursOverrides[item.id] : ""}
                        onChange={(e) => setHoursOverrides(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val === "" || isNaN(parseFloat(val))) {
                            setHoursOverrides(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                          }
                        }}
                        className="w-24 text-center text-sm font-semibold border border-primary/30 rounded-lg px-2 py-1 bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                        data-testid={`input-hours-${item.id}`}
                      />
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <span className="text-xs font-mono text-muted-foreground bg-muted/40 rounded px-2 py-1 whitespace-nowrap">
                        {item.isHourly
                          ? `₹${item.hourlyRate.toLocaleString('en-IN')} × ${item.totalHoursWorked % 1 === 0 ? item.totalHoursWorked.toFixed(0) : item.totalHoursWorked.toFixed(2)} hrs`
                          : `₹${item.dailyRate.toLocaleString('en-IN')} × ${item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)} days`}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right font-semibold text-sm" data-testid={`text-gross-${item.id}`}>
                      ₹{item.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="py-4 text-right" data-testid={`text-advance-${item.id}`}>
                      {item.advanceTaken > 0 ? (
                        <span className="font-semibold text-red-600 dark:text-red-400 text-sm">
                          − ₹{item.advanceTaken.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-right font-bold text-primary text-base" data-testid={`text-net-${item.id}`}>
                      ₹{item.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                salary: item.dailyRate.toString(),
                                hourlyRate: item.hourlyRate.toString(),
                                workHours: item.stdHours.toString(),
                              } as Employee}
                              attendance={item.employeeAttendance}
                              startDate={startDate}
                              endDate={endDate}
                              overriddenHours={item.totalHoursWorked}
                              advanceTaken={item.advanceTaken}
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
                  <TableCell colSpan={6} className="pl-6 py-5 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                    Grand Total — {filteredSalaryData.length} Employees
                  </TableCell>
                  <TableCell className="py-5 text-right font-bold text-base text-foreground">
                    ₹{totals.gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="py-5 text-right font-bold text-base text-red-600 dark:text-red-400">
                    {totals.advances > 0 ? `− ₹${totals.advances.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                  </TableCell>
                  <TableCell className="py-5 text-right font-bold text-xl text-primary" data-testid="text-grand-net-total">
                    ₹{totals.net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="pr-6" />
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
            {search && (
              <Button variant="ghost" onClick={() => setSearch("")} className="mt-2 text-primary" data-testid="button-clear-search-mobile">
                Clear search
              </Button>
            )}
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
                    <h3 className="font-bold text-base leading-tight" data-testid={`text-employee-name-mobile-${item.id}`}>{item.name}</h3>
                    <Badge variant="secondary" className="mt-1 text-[10px]">{item.designation}</Badge>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl bg-primary/5 border-transparent text-primary hover:bg-primary hover:text-primary-foreground flex-shrink-0"
                        data-testid={`button-view-slip-mobile-${item.id}`}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-[380px] rounded-2xl p-6">
                      <DialogHeader>
                        <DialogTitle className="text-lg">Salary Slip</DialogTitle>
                      </DialogHeader>
                      <div className="text-sm font-semibold text-foreground mt-2">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.designation} • {format(selectedDate, "MMMM yyyy")}</div>
                      <div className="mt-4 space-y-2 text-sm border rounded-xl p-4 bg-muted/30">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{item.isHourly ? "Hours Worked:" : "Days Worked:"}</span>
                          <span className="font-semibold">
                            {item.isHourly
                              ? `${item.totalHoursWorked % 1 === 0 ? item.totalHoursWorked.toFixed(0) : item.totalHoursWorked.toFixed(2)} hrs`
                              : `${item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)} / ${item.daysInMonth} days`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{item.isHourly ? "Hourly Rate:" : "Daily Rate:"}</span>
                          <span className="font-semibold">₹{(item.isHourly ? item.hourlyRate : item.dailyRate).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">Gross Salary:</span>
                          <span className="font-semibold">₹{item.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {item.advanceTaken > 0 && (
                          <div className="flex justify-between">
                            <span className="text-red-600 font-semibold">Advance Deducted:</span>
                            <span className="font-bold text-red-600">− ₹{item.advanceTaken.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t pt-2 bg-primary/5 rounded-lg px-2 py-1">
                          <span className="font-bold text-primary">Net Payable:</span>
                          <span className="font-bold text-primary text-lg">₹{item.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Net Pay</p>
                    <p className="font-bold text-sm text-primary">₹{(item.netPayable / 1000).toFixed(1)}K</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex-1">Override Hours</p>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder={item.autoHoursWorked % 1 === 0 ? item.autoHoursWorked.toFixed(0) : item.autoHoursWorked.toFixed(2)}
                    value={hoursOverrides[item.id] !== undefined ? hoursOverrides[item.id] : ""}
                    onChange={(e) => setHoursOverrides(prev => ({ ...prev, [item.id]: e.target.value }))}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val === "" || isNaN(parseFloat(val))) {
                        setHoursOverrides(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                      }
                    }}
                    className="w-24 text-center text-sm font-semibold border border-primary/30 rounded-lg px-2 py-1.5 bg-white dark:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                    data-testid={`input-hours-mobile-${item.id}`}
                  />
                </div>

                <div className="bg-muted/30 rounded-lg p-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono">
                      {item.isHourly
                        ? `₹${item.hourlyRate.toLocaleString('en-IN')} × ${item.totalHoursWorked % 1 === 0 ? item.totalHoursWorked.toFixed(0) : item.totalHoursWorked.toFixed(2)} hrs`
                        : `₹${item.dailyRate.toLocaleString('en-IN')} × ${item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)} days`}
                    </span>
                    <span className="font-semibold">₹{item.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  {item.advanceTaken > 0 && (
                    <div className="flex justify-between text-xs mt-1 text-red-600 dark:text-red-400">
                      <span>Advance deducted</span>
                      <span className="font-semibold">− ₹{item.advanceTaken.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile Footer Summary */}
      {filteredSalaryData.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 lg:hidden">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-3">Grand Total — {filteredSalaryData.length} Employees</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Gross</p>
              <p className="text-base font-bold text-foreground mt-1">₹{(totals.gross / 1000).toFixed(1)}K</p>
            </div>
            <div>
              <p className="text-[10px] text-red-500 uppercase font-bold">Advances</p>
              <p className="text-base font-bold text-red-600 mt-1">− ₹{(totals.advances / 1000).toFixed(1)}K</p>
            </div>
            <div>
              <p className="text-[10px] text-primary uppercase font-bold">Net Pay</p>
              <p className="text-xl font-bold text-primary mt-1" data-testid="text-grand-net-total-mobile">₹{(totals.net / 1000).toFixed(1)}K</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-[10px] text-muted-foreground italic px-4 pb-2">
        <p>Computer-generated salary report • Daily Wage Basis • No PF/ESI deductions</p>
      </div>
    </div>
  );
}
