import { useState } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { FaceScanner } from "@/components/FaceScanner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FaceRegistrationPage() {
  const { data: employees, isLoading } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const { toast } = useToast();

  const selectedEmployee = employees?.find(e => e.id.toString() === selectedEmployeeId);

  const faceRegistration = useMutation({
    mutationFn: async ({ id, descriptor }: { id: number; descriptor: number[] }) => {
      const res = await apiRequest("POST", `/api/employees/${id}/face-registration`, { faceDescriptor: descriptor });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Success", description: "Face registered successfully" });
      setSelectedEmployeeId("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to register face", variant: "destructive" });
    }
  });

  const handleFaceScan = (descriptor: Float32Array) => {
    if (selectedEmployee) {
      faceRegistration.mutate({ id: selectedEmployee.id, descriptor: Array.from(descriptor) });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-2 text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Face Registration</h1>
        <p className="text-muted-foreground">Select an employee and scan their face to enable biometric recognition.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card className="shadow-md border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Employee Selection
            </CardTitle>
            <CardDescription>Choose the staff member you want to register.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Employee</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder={isLoading ? "Loading employees..." : "Choose an employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{employee.name}</span>
                        {employee.faceDescriptor ? (
                          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">
                            Registered
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="ml-auto text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEmployee && (
              <div className="p-4 rounded-xl bg-muted/30 border space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground">Designation:</span>
                  <span className="text-sm font-medium">{selectedEmployee.designation}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground">Phone:</span>
                  <span className="text-sm font-medium">{selectedEmployee.phoneNumber}</span>
                </div>
                {selectedEmployee.faceDescriptor && (
                  <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm pt-2 border-t border-emerald-100">
                    <UserCheck className="w-4 h-4" />
                    Face already registered
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className={!selectedEmployee ? "opacity-50 pointer-events-none grayscale transition-all duration-300" : "transition-all duration-300"}>
          <FaceScanner 
            employeeName={selectedEmployee?.name}
            selectedEmployeeId={selectedEmployeeId}
            onScanComplete={handleFaceScan}
          />
        </div>
      </div>
    </div>
  );
}
