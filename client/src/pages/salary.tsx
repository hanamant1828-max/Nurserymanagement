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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Calendar as CalendarIcon, Download, FileText, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO } from "date-fns";
import { Attendance, Employee } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoicePrint } from "@/components/invoice-print";

export default function SalaryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data: employees, isLoading: employeesLoading } = useEmployees();

  const monthStr = format(selectedDate, "yyyy-MM");
  const startDate = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const endDate = format(endOfMonth(selectedDate), "yyyy-MM-dd");

  // Fetch attendance for all days in the month
  // Since we don't have a bulk range API for all employees, we'll fetch day by day or just use the existing single day API if we had to.
  // Actually, let's assume we might need a better API, but for now we'll fetch all attendance records we can.
  // Wait, I can't easily fetch all attendance for a month for all employees without a loop or a new API.
  // I'll add a new API route for this.
  
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
      const presentDays = employeeAttendance.filter(a => a.status === "PRESENT").length;
      const dailyRate = parseFloat(employee.salary || "0");
      const totalSalary = presentDays * dailyRate;

      return {
        id: employee.id,
        name: employee.name,
        designation: employee.designation,
        dailyRate,
        presentDays,
        daysInMonth,
        totalSalary
      };
    });
  }, [employees, allAttendance, selectedDate]);

  const grandTotal = useMemo(() => {
    return salaryData.reduce((sum, item) => sum + item.totalSalary, 0);
  }, [salaryData]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  if (employeesLoading || attendanceLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold tracking-tight">Salary Report</h1>
          <p className="text-muted-foreground text-sm">Calculate and view monthly salaries based on attendance.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Select 
              value={selectedDate.getMonth().toString()} 
              onValueChange={(val) => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(parseInt(val));
                setSelectedDate(newDate);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, idx) => (
                  <SelectItem key={month} value={idx.toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={selectedDate.getFullYear().toString()} 
              onValueChange={(val) => {
                const newDate = new Date(selectedDate);
                newDate.setFullYear(parseInt(val));
                setSelectedDate(newDate);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Monthly Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">For {format(selectedDate, "MMMM yyyy")}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50/50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 uppercase tracking-wider">Policy Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-amber-900">Daily Wage Basis</p>
            <p className="text-xs text-amber-600 mt-1">No PF or ESI deductions applicable for this nursery staff.</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider">Employee Name</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Designation</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Daily Rate</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Total Days</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Days Worked</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">Calculation</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Net Salary</TableHead>
              <TableHead className="py-4 pr-6 font-bold text-xs uppercase tracking-wider text-center">Salary Slip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salaryData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No employee records found.
                </TableCell>
              </TableRow>
            ) : (
              salaryData.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="pl-6 py-4 font-medium">{item.name}</TableCell>
                  <TableCell className="py-4 text-muted-foreground">{item.designation}</TableCell>
                  <TableCell className="py-4 text-right">₹{item.dailyRate.toFixed(2)}</TableCell>
                  <TableCell className="py-4 text-right text-muted-foreground">{item.daysInMonth}</TableCell>
                  <TableCell className="py-4 text-right font-semibold text-emerald-600">{item.presentDays}</TableCell>
                  <TableCell className="py-4 text-center text-xs font-mono text-muted-foreground">
                    ₹{item.dailyRate} × {item.presentDays}
                  </TableCell>
                  <TableCell className="py-4 text-right font-bold text-primary">₹{item.totalSalary.toFixed(2)}</TableCell>
                  <TableCell className="py-4 pr-6 text-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                          data-testid={`button-view-slip-${item.id}`}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Salary Slip - {item.name}</DialogTitle>
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
          <TableFooter>
            <TableRow className="bg-muted/50">
              <TableCell colSpan={7} className="pl-6 py-6 font-bold text-lg">Grand Total Monthly Payout</TableCell>
              <TableCell colSpan={1} className="pr-6 py-6 text-right font-bold text-2xl text-primary">₹{grandTotal.toFixed(2)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div className="flex justify-end p-2">
        <p className="text-[10px] text-muted-foreground italic">* This is a computer-generated salary report. No PF/ESI deductions have been made.</p>
      </div>
    </div>
  );
}
