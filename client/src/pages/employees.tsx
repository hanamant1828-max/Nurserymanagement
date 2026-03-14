import { useState } from "react";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Users, Trash2, Phone, Mail, MapPin, Briefcase, Camera, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { insertEmployeeSchema, type Employee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertEmployeeSchema;

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [payType, setPayType] = useState<"daily" | "hourly">("daily");
  const { toast } = useToast();

  const { mutate: create, isPending: creating } = useCreateEmployee();
  const { mutate: update, isPending: updating } = useUpdateEmployee();
  const { mutate: deleteEmployee } = useDeleteEmployee();

  const filteredEmployees = employees?.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.designation.toLowerCase().includes(search.toLowerCase()) ||
    e.phoneNumber.includes(search)
  ) || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      name: "", 
      designation: "", 
      phoneNumber: "", 
      email: "", 
      address: "", 
      joiningDate: new Date().toISOString().split('T')[0],
      salary: "",
      hourlyRate: "",
      workHours: "8",
      active: true 
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const submitData = {
      ...data,
      email: data.email || null,
      address: data.address || null,
      joiningDate: data.joiningDate || null,
      salary: payType === "daily" ? (data.salary || null) : null,
      hourlyRate: payType === "hourly" ? (data.hourlyRate || null) : null,
      workHours: "8",
    };

    if (editingId) {
      update({ id: editingId, ...submitData }, { 
        onSuccess: () => { 
          setOpen(false); 
          resetForm();
          toast({ title: "Success", description: "Employee updated successfully" });
        } 
      });
    } else {
      create(submitData, { 
        onSuccess: () => { 
          setOpen(false); 
          resetForm();
          toast({ title: "Success", description: "Employee added successfully" });
        } 
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteEmployee(id, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Employee deleted successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete employee",
          variant: "destructive",
        });
      },
    });
  };

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    const empHourlyRate = parseFloat((employee as any).hourlyRate || "0");
    const detectedPayType: "daily" | "hourly" = empHourlyRate > 0 ? "hourly" : "daily";
    setPayType(detectedPayType);
    form.reset({ 
      name: employee.name, 
      designation: employee.designation,
      phoneNumber: employee.phoneNumber,
      email: employee.email || "",
      address: employee.address || "",
      joiningDate: employee.joiningDate || "",
      salary: employee.salary || "",
      hourlyRate: (employee as any).hourlyRate || "",
      workHours: (employee as any).workHours || "8",
      active: employee.active,
    });
    setOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setPayType("daily");
    form.reset({ 
      name: "", 
      designation: "", 
      phoneNumber: "", 
      email: "", 
      address: "", 
      joiningDate: new Date().toISOString().split('T')[0],
      salary: "",
      hourlyRate: "",
      workHours: "8",
      active: true 
    });
  };

  const activeCount = filteredEmployees.filter(e => e.active).length;

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Master</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage nursery staff and their contact information.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{editingId ? "Edit Employee" : "New Employee"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Update employee details in the system." : "Add a new staff member to the nursery roster."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Employee Name" className="h-11 rounded-lg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Designation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Supervisor, Labor" className="h-11 rounded-lg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="10 digit number" className="h-11 rounded-lg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Email (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="email@example.com" type="email" className="h-11 rounded-lg" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Employee Address" className="h-11 rounded-lg" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="joiningDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Joining Date</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-11 rounded-lg" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <p className="font-semibold text-sm">Pay Type</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPayType("daily")}
                        data-testid="button-pay-type-daily"
                        className={`h-12 rounded-xl border-2 text-sm font-semibold transition-all ${
                          payType === "daily"
                            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                            : "border-muted bg-muted/20 text-muted-foreground hover:border-muted-foreground/30"
                        }`}
                      >
                        Per Day
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayType("hourly")}
                        data-testid="button-pay-type-hourly"
                        className={`h-12 rounded-xl border-2 text-sm font-semibold transition-all ${
                          payType === "hourly"
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                            : "border-muted bg-muted/20 text-muted-foreground hover:border-muted-foreground/30"
                        }`}
                      >
                        Per Hour
                      </button>
                    </div>

                    {payType === "daily" ? (
                      <FormField
                        control={form.control}
                        name="salary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-sm">Daily Wage (₹)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. 500"
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-11 rounded-lg"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-daily-wage"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Amount paid per full working day</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-sm">Hourly Rate (₹)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. 60"
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-11 rounded-lg"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-hourly-rate"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Amount paid per hour worked</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border bg-muted/20 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">Active Status</FormLabel>
                          <p className="text-xs text-muted-foreground leading-none">
                            Mark if the employee is currently working
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl">Cancel</Button>
                    <Button type="submit" data-testid="button-save-employee" className="flex-[2] h-11 rounded-xl font-bold" disabled={creating || updating}>
                      {editingId ? "Update Employee" : "Save Employee"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{filteredEmployees.length}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold uppercase tracking-wider">Total Staff</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">{activeCount}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold uppercase tracking-wider">Active</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{filteredEmployees.length - activeCount}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold uppercase tracking-wider">Inactive</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{employees?.length || 0}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-semibold uppercase tracking-wider">Total Registered</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold mb-4 text-foreground">Search</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, designation or phone..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Designation</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Contact</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Joining Date</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="py-4 pr-6 text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-6 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
                    <TableCell className="pr-6"><div className="h-9 w-9 ml-auto bg-muted animate-pulse rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Users className="w-12 h-12 opacity-10" />
                      <p className="text-sm font-medium">No employees found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6 py-4 font-bold text-lg">{employee.name}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        {employee.designation}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          {employee.phoneNumber}
                        </div>
                        {employee.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {employee.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground text-sm">{employee.joiningDate}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant={employee.active ? "default" : "secondary"} className={`rounded-full px-3 py-0.5 font-medium ${employee.active ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""}`}>
                        {employee.active ? "Active" : "Inactive"}
                      </Badge>
                      {employee.faceDescriptor && (
                        <Badge variant="outline" className="rounded-full px-3 py-0.5 font-medium bg-blue-50 text-blue-600 border-blue-200 ml-2">
                          Face Registered
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary" onClick={() => handleEdit(employee)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl">Remove Employee?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove <span className="font-bold text-foreground">"{employee.name}"</span> from the system? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="rounded-xl mt-0">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(employee.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl">
                                Yes, Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden grid grid-cols-1 gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl border" />
          ))
        ) : filteredEmployees.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed rounded-2xl border-muted-foreground/10">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-5" />
            <p className="text-muted-foreground font-medium">No employees found</p>
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <div key={employee.id} className="bg-card border rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{employee.name}</h3>
                  <p className="text-sm text-muted-foreground">{employee.designation}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={employee.active ? "default" : "secondary"} className={`rounded-full text-[10px] uppercase tracking-wider ${employee.active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}`}>
                    {employee.active ? "Active" : "Off"}
                  </Badge>
                  {employee.faceDescriptor && (
                    <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wider bg-blue-50 text-blue-600 border-blue-200">
                      Face Registered
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  {employee.phoneNumber}
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  {employee.joiningDate}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 h-10 rounded-xl bg-muted/20 border-transparent hover:bg-primary hover:text-primary-foreground" onClick={() => handleEdit(employee)}>
                  <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-10 rounded-xl bg-destructive/5 border-transparent text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] max-w-[340px] rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Employee?</AlertDialogTitle>
                      <AlertDialogDescription>Delete "{employee.name}" record permanently.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col gap-2 mt-4">
                      <AlertDialogCancel className="rounded-xl w-full">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(employee.id)} className="bg-destructive text-white rounded-xl w-full">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
