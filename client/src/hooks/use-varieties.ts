import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type CreateVarietyInput = z.infer<typeof api.varieties.create.input>;
type UpdateVarietyInput = z.infer<typeof api.varieties.update.input>;

export function useVarieties() {
  return useQuery({
    queryKey: [api.varieties.list.path],
    queryFn: async () => {
      const res = await fetch(api.varieties.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch varieties");
      return api.varieties.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateVariety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateVarietyInput) => {
      // Coerce categoryId to number if string
      const payload = { ...data, categoryId: Number(data.categoryId) };
      const res = await fetch(api.varieties.create.path, {
        method: api.varieties.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create variety");
      return api.varieties.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.varieties.list.path] });
    },
  });
}

export function useUpdateVariety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateVarietyInput) => {
      // Coerce categoryId if present
      const payload = updates.categoryId ? { ...updates, categoryId: Number(updates.categoryId) } : updates;
      const url = buildUrl(api.varieties.update.path, { id });
      const res = await fetch(url, {
        method: api.varieties.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update variety");
      return api.varieties.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.varieties.list.path] });
    },
  });
}
