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
import { Loader2, DollarSign, Users, Calendar as CalendarIcon, Download, FileText, Search } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { Attendance, Employee } from "@shared/schema";
import { InvoicePrint } from "@/components/invoice-print";

export default function SalaryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
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

  const salaryData = useMemo(() => {
    if (!employees || !allAttendance) return [];

    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate)
    }).length;

    return employees.map(employee => {
      const employeeAttendance = allAttendance.filter(a => a.employeeId === employee.id);

      let totalHoursWorked = 0;
      for (const record of employeeAttendance) {
        if (record.status !== "PRESENT") continue;
        if (record.inTime && record.outTime && record.inTime !== record.outTime) {
          const [inH, inM, inS = 0] = record.inTime.split(":").map(Number);
          const [outH, outM, outS = 0] = record.outTime.split(":").map(Number);
          const inMinutes = inH * 60 + inM + inS / 60;
          const outMinutes = outH * 60 + outM + outS / 60;
          const workedMinutes = outMinutes - inMinutes;
          if (workedMinutes >= 30) {
            totalHoursWorked += Math.min(workedMinutes / 60, 8);
          } else {
            totalHoursWorked += 8;
          }
        } else {
          totalHoursWorked += 8;
        }
      }

      const totalDaysWorked = totalHoursWorked / 8;
      const dailyRate = parseFloat(employee.salary || "0");
      const totalSalary = dailyRate * totalDaysWorked;

      return {
        id: employee.id,
        name: employee.name,
        designation: employee.designation,
        dailyRate,
        presentDays: totalDaysWorked,
        daysInMonth,
        totalSalary,
        totalHoursWorked
      };
    });
  }, [employees, allAttendance, selectedDate]);

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
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Daily Rate</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">Days Worked</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">Calculation</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Net Salary</TableHead>
                <TableHead className="py-4 pr-6 font-bold text-xs uppercase tracking-wider text-center">Slip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalaryData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
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
                    <TableCell className="py-4 text-right font-semibold text-primary">₹{item.dailyRate.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="py-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-bold">
                        {item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)}/{item.daysInMonth}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-center text-xs font-mono text-muted-foreground bg-muted/20 rounded px-2 py-1">
                      ₹{item.dailyRate.toLocaleString('en-IN')} × {item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-4 text-right font-bold text-primary text-lg">₹{item.totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
                  <TableCell colSpan={5} className="pl-6 py-6 font-bold text-sm uppercase tracking-wider">Grand Total Monthly Payout</TableCell>
                  <TableCell className="py-6 text-right font-bold text-2xl text-primary">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Daily Rate</p>
                    <p className="font-bold text-sm text-primary">₹{(item.dailyRate / 100).toFixed(0)}×100</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Days</p>
                    <p className="font-bold text-sm text-green-600">{item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)}/{item.daysInMonth}</p>
                  </div>
                  <div className="bg-primary/5 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Salary</p>
                    <p className="font-bold text-sm text-primary">₹{(item.totalSalary / 1000).toFixed(0)}K</p>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Calculation</p>
                  <p className="text-sm font-mono font-semibold">₹{item.dailyRate.toLocaleString('en-IN')} × {item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)}</p>
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
                          <span>Days Worked:</span>
                          <span className="font-bold">{item.presentDays % 1 === 0 ? item.presentDays.toFixed(0) : item.presentDays.toFixed(2)}/{item.daysInMonth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Daily Rate:</span>
                          <span className="font-bold">₹{item.dailyRate.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-bold">Total Salary:</span>
                          <span className="font-bold text-primary text-lg">₹{item.totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
    </div>
  );
}
