import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AuditLog, User, RolePermission } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2, History, Edit2, Shield } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGES = [
  { name: "Dashboard", path: "/" },
  { name: "Categories", path: "/categories" },
  { name: "Varieties", path: "/varieties" },
  { name: "Lots", path: "/lots" },
  { name: "Orders", path: "/orders" },
  { name: "Today Deliveries", path: "/today-deliveries" },
  { name: "Customers", path: "/customers" },
  { name: "Reports", path: "/reports" },
  { name: "Delivery Reports", path: "/delivery-reports" },
  { name: "Seed Inward", path: "/seed-inward" },
  { name: "User Management", path: "/users" },
];

export default function UserManagementPage() {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("staff");
  
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: logs, isLoading: logsLoading } = useQuery<(AuditLog & { user: User })[]>({ queryKey: ["/api/audit-logs"] });
  const { data: permissions, isLoading: permissionsLoading } = useQuery<RolePermission[]>({
    queryKey: [`/api/roles/${selectedRole}/permissions`],
    enabled: !!selectedRole,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "User created successfully" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PUT", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      toast({ title: "Success", description: "User updated successfully" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "User deleted successfully" });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ pagePath, ...permissions }: { pagePath: string; canView?: boolean; canCreate?: boolean; canUpdate?: boolean; canDelete?: boolean }) => {
      await apiRequest("POST", `/api/roles/${selectedRole}/permissions`, { pagePath, ...permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/roles/${selectedRole}/permissions`] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-permissions"] });
      toast({ title: "Success", description: "Permission updated successfully" });
    },
  });

  if (usersLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const roles = Array.from(new Set(users?.map((u) => u.role) || []));
  if (!roles.includes("staff")) roles.push("staff");
  if (!roles.includes("manager")) roles.push("manager");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">Manage system users, roles, and access permissions.</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5" />
                  Add New User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createUserMutation.mutate(Object.fromEntries(formData));
                  e.currentTarget.reset();
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" name="firstName" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input id="phoneNumber" name="phoneNumber" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" required autoComplete="new-password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select name="role" defaultValue="staff">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Current Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-10 px-4 text-left font-medium">Name</th>
                        <th className="h-10 px-4 text-left font-medium">Username</th>
                        <th className="h-10 px-4 text-left font-medium">Phone</th>
                        <th className="h-10 px-4 text-left font-medium">Role</th>
                        <th className="h-10 px-4 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/30">
                          <td className="p-4 font-medium">
                            {user.firstName || user.lastName 
                              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                              : "-"}
                          </td>
                          <td className="p-4">{user.username}</td>
                          <td className="p-4 text-muted-foreground">{user.phoneNumber || "-"}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingUser(user)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {user.username !== "admin" && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this user?")) {
                                    deleteUserMutation.mutate(user.id);
                                  }
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Roles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {roles.map((role) => (
                  <Button
                    key={role}
                    variant={selectedRole === role ? "default" : "outline"}
                    className="w-full justify-start capitalize"
                    onClick={() => setSelectedRole(role)}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    {role}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="capitalize text-lg">{selectedRole} Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                {permissionsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>View/Page</TableHead>
                        <TableHead className="w-[100px]">View</TableHead>
                        <TableHead className="w-[100px]">Create</TableHead>
                        <TableHead className="w-[100px]">Update</TableHead>
                        <TableHead className="w-[100px]">Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PAGES.map((page) => {
                        const permission = permissions?.find((p) => p.pagePath === page.path);
                        const canView = permission ? permission.canView : (selectedRole === "admin");
                        const canCreate = permission ? permission.canCreate : (selectedRole === "admin");
                        const canUpdate = permission ? permission.canUpdate : (selectedRole === "admin");
                        const canDelete = permission ? permission.canDelete : (selectedRole === "admin");

                        return (
                          <TableRow key={page.path}>
                            <TableCell className="font-medium">{page.name}</TableCell>
                            <TableCell>
                              <Checkbox
                                checked={canView}
                                disabled={selectedRole === "admin" || updatePermissionMutation.isPending}
                                onCheckedChange={(checked) => {
                                  updatePermissionMutation.mutate({
                                    pagePath: page.path,
                                    canView: !!checked,
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={canCreate}
                                disabled={selectedRole === "admin" || updatePermissionMutation.isPending}
                                onCheckedChange={(checked) => {
                                  updatePermissionMutation.mutate({
                                    pagePath: page.path,
                                    canCreate: !!checked,
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={canUpdate}
                                disabled={selectedRole === "admin" || updatePermissionMutation.isPending}
                                onCheckedChange={(checked) => {
                                  updatePermissionMutation.mutate({
                                    pagePath: page.path,
                                    canUpdate: !!checked,
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={canDelete}
                                disabled={selectedRole === "admin" || updatePermissionMutation.isPending}
                                onCheckedChange={(checked) => {
                                  updatePermissionMutation.mutate({
                                    pagePath: page.path,
                                    canDelete: !!checked,
                                  });
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left font-medium">Time</th>
                      <th className="h-10 px-4 text-left font-medium">User</th>
                      <th className="h-10 px-4 text-left font-medium">Action</th>
                      <th className="h-10 px-4 text-left font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs?.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/30">
                        <td className="p-4 whitespace-nowrap">{format(new Date(log.timestamp), "MMM d, HH:mm")}</td>
                        <td className="p-4 font-medium">{log.user?.username || 'Unknown'}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.username}</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData);
              if (!data.password) delete data.password;
              updateUserMutation.mutate({ id: editingUser.id, data });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input id="edit-firstName" name="firstName" defaultValue={editingUser.firstName || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input id="edit-lastName" name="lastName" defaultValue={editingUser.lastName || ''} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phoneNumber">Phone Number</Label>
                <Input id="edit-phoneNumber" name="phoneNumber" defaultValue={editingUser.phoneNumber || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                <Input id="edit-password" name="password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select name="role" defaultValue={editingUser.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
