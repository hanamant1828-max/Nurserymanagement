import { useQuery, useMutation } from "@tanstack/react-query";
import { Attendance, Employee, insertAttendanceSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";

export function useAttendance(date: string) {
  return useQuery<(Attendance & { employee: Employee })[]>({
    queryKey: ["/api/attendance", date],
  });
}

export function useRecordAttendance() {
  return useMutation({
    mutationFn: async (data: z.infer<typeof insertAttendanceSchema>) => {
      const res = await apiRequest("POST", "/api/attendance", data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", variables.date] });
    },
  });
}

export function useEmployeeAttendance(id: number, startDate: string, endDate: string) {
  return useQuery<Attendance[]>({
    queryKey: ["/api/employees", id, "attendance", startDate, endDate],
    enabled: !!id && !!startDate && !!endDate,
  });
}
