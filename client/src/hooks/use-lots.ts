import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type CreateLotInput = z.infer<typeof api.lots.create.input>;
type UpdateLotInput = z.infer<typeof api.lots.update.input>;

export function useLots() {
  return useQuery({
    queryKey: [api.lots.list.path],
    queryFn: async () => {
      const res = await fetch(api.lots.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lots");
      return api.lots.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLotInput) => {
      const payload = {
        ...data,
        categoryId: Number(data.categoryId),
        varietyId: Number(data.varietyId),
        seedsSown: Number(data.seedsSown),
      };
      
      const res = await fetch(api.lots.create.path, {
        method: api.lots.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create lot");
      }
      return api.lots.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lots.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seed-inward/lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/unallocated-count"] });
    },
  });
}

export function useDeleteLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.lots.delete.path, { id });
      const res = await fetch(url, {
        method: api.lots.delete.method,
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete lot");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lots.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seed-inward/lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/unallocated-count"] });
    },
  });
}

export function useUpdateLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateLotInput) => {
      // Coerce numbers
      const payload: any = { ...updates };
      if (updates.damaged !== undefined) payload.damaged = Number(updates.damaged);
      
      const url = buildUrl(api.lots.update.path, { id });
      const res = await fetch(url, {
        method: api.lots.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update lot");
      return api.lots.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lots.list.path] });
      // Invalidate orders if lot availability changed significantly
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}
