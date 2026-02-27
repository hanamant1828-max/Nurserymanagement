import { useState } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useAttendance, useRecordAttendance } from "@/hooks/use-attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Camera
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FaceScanner } from "@/components/FaceScanner";
import * as faceapi from 'face-api.js';

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [verifyingEmployee, setVerifyingEmployee] = useState<any>(null);
  
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendance(date);
  const { mutate: recordAttendance } = useRecordAttendance();
  const { toast } = useToast();

    const handleFaceVerify = async (descriptor: Float32Array) => {
    if (!verifyingEmployee || !verifyingEmployee.faceDescriptor) return;

    try {
      const savedDescriptor = new Float32Array(JSON.parse(verifyingEmployee.faceDescriptor));
      const distance = faceapi.euclideanDistance(descriptor, savedDescriptor);
      
      // Threshold for face matching (usually 0.6 is good for SSD MobileNet)
      if (distance < 0.6) {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ":" + 
                          now.getMinutes().toString().padStart(2, '0') + ":" + 
                          now.getSeconds().toString().padStart(2, '0');
        
        const existingAttendance = attendanceData?.find(a => a.employeeId === verifyingEmployee.id);
        const newStatus = "PRESENT";
        
        recordAttendance({
          employeeId: verifyingEmployee.id,
          date,
          status: newStatus,
          inTime: existingAttendance?.inTime || currentTime,
          outTime: existingAttendance?.inTime ? currentTime : existingAttendance?.outTime || null,
          remarks: ""
        }, {
          onSuccess: () => {
            setScannerOpen(false);
            toast({
              title: "Verification Successful",
              description: `Attendance marked for ${verifyingEmployee.name}`,
            });
          }
        });
      } else {
        toast({
          title: "Verification Failed",
          description: "Face does not match our records.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process face data.",
        variant: "destructive",
      });
    }
  };

  const activeEmployees = employees?.filter(e => e.active) || [];
  const filteredEmployees = activeEmployees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatus = (employeeId: number) => {
    return attendanceData?.find(a => a.employeeId === employeeId)?.status || "PENDING";
  };

  const handleStatusChange = (employeeId: number, status: string) => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" + 
                      now.getMinutes().toString().padStart(2, '0') + ":" + 
                      now.getSeconds().toString().padStart(2, '0');
    
    const existingAttendance = attendanceData?.find(a => a.employeeId === employeeId);
    
    let inTime = existingAttendance?.inTime || null;
    let outTime = existingAttendance?.outTime || null;

    if (status === "PRESENT") {
      if (!inTime) {
        inTime = currentTime;
      } else if (!outTime) {
        outTime = currentTime;
      }
    }

    recordAttendance({
      employeeId,
      date,
      status,
      inTime,
      outTime,
      remarks: ""
    }, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: `Attendance updated for today`,
        });
      }
    });
  };

  const navigateDate = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    setDate(newDate.toISOString().split('T')[0]);
  };

  const stats = {
    present: attendanceData?.filter(a => a.status === "PRESENT").length || 0,
    absent: attendanceData?.filter(a => a.status === "ABSENT").length || 0,
    leave: attendanceData?.filter(a => a.status === "LEAVE").length || 0,
    pending: activeEmployees.length - (attendanceData?.length || 0)
  };

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold tracking-tight">Daily Attendance</h1>
          <p className="text-muted-foreground text-sm">Track and manage employee attendance records.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-card border rounded-xl p-1 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => navigateDate(-1)} className="rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-2 font-bold min-w-[140px] justify-center">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="border-none bg-transparent h-8 p-0 focus-visible:ring-0 w-32"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigateDate(1)} className="rounded-lg">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Present", value: stats.present, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Absent", value: stats.absent, color: "text-destructive", bg: "bg-destructive/5" },
          { label: "Leave", value: stats.leave, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Pending", value: stats.pending, color: "text-muted-foreground", bg: "bg-muted/50" }
        ].map((stat) => (
          <div key={stat.label} className={cn("p-4 rounded-2xl border shadow-sm", stat.bg)}>
            <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{stat.label}</p>
            <p className={cn("text-2xl font-display font-bold", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search by name or designation..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-11 rounded-xl bg-card"
        />
      </div>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider">Employee</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Designation</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">In Time</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Out Time</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider w-[200px]">Status</TableHead>
              <TableHead className="py-4 pr-6 text-right font-bold text-xs uppercase tracking-wider">Indicator</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employeesLoading || attendanceLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  <TableCell className="pl-6 py-4"><div className="h-5 w-40 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-10 w-full bg-muted animate-pulse rounded-lg" /></TableCell>
                  <TableCell className="pr-6"><div className="h-6 w-6 ml-auto bg-muted animate-pulse rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                  No active employees found
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => {
                const status = getStatus(employee.id);
                return (
                  <TableRow key={employee.id} className="group hover:bg-muted/5 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="font-bold">{employee.name}</div>
                      <div className="text-xs text-muted-foreground">{employee.phoneNumber}</div>
                    </TableCell>
                    <TableCell className="py-4 text-sm font-medium">{employee.designation}</TableCell>
                    <TableCell className="py-4 text-sm font-medium">
                      {attendanceData?.find(a => a.employeeId === employee.id)?.inTime || "-"}
                    </TableCell>
                    <TableCell className="py-4 text-sm font-medium">
                      {attendanceData?.find(a => a.employeeId === employee.id)?.outTime || "-"}
                    </TableCell>
                    <TableCell className="py-4">
                      <Select 
                        value={status} 
                        onValueChange={(val) => handleStatusChange(employee.id, val)}
                      >
                        <SelectTrigger className={cn(
                          "h-10 rounded-lg font-medium",
                          status === "PRESENT" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          status === "ABSENT" && "bg-destructive/5 text-destructive border-destructive/10",
                          status === "LEAVE" && "bg-amber-50 text-amber-700 border-amber-200",
                          status === "PENDING" && "bg-muted text-muted-foreground"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENT">Present</SelectItem>
                          <SelectItem value="ABSENT">Absent</SelectItem>
                          <SelectItem value="LEAVE">Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right flex items-center justify-end gap-2">
                      {employee.faceDescriptor && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary"
                          onClick={() => {
                            setVerifyingEmployee(employee);
                            setScannerOpen(true);
                          }}
                          title="Verify with Face Scan"
                        >
                          <Camera className="w-4 h-4" />
                        </Button>
                      )}
                      {status === "PRESENT" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {status === "ABSENT" && <XCircle className="w-5 h-5 text-destructive" />}
                      {status === "LEAVE" && <Clock className="w-5 h-5 text-amber-500" />}
                      {status === "PENDING" && <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Face Verification</DialogTitle>
          </DialogHeader>
          {verifyingEmployee && (
            <FaceScanner 
              employeeName={verifyingEmployee.name}
              onScanComplete={handleFaceVerify}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
