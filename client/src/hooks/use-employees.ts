import { useQuery, useMutation } from "@tanstack/react-query";
import { Employee, insertEmployeeSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });
}

export function useCreateEmployee() {
  return useMutation({
    mutationFn: async (data: z.infer<typeof insertEmployeeSchema>) => {
      const res = await apiRequest("POST", "/api/employees", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
  });
}

export function useUpdateEmployee() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Employee> & { id: number }) => {
      const res = await apiRequest("PUT", `/api/employees/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
  });
}

export function useDeleteEmployee() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
  });
}
