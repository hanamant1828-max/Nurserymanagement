import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type CreateOrderInput = z.infer<typeof api.orders.create.input>;
type UpdateOrderInput = z.infer<typeof api.orders.update.input>;

export function useOrders(page: number = 1, limit: number = 50, sortField: string = "id", sortOrder: "asc" | "desc" = "desc") {
  return useQuery({
    queryKey: [api.orders.list.path, page, limit, sortField, sortOrder],
    queryFn: async () => {
      const url = `${api.orders.list.path}?page=${page}&limit=${limit}&sortField=${sortField}&sortOrder=${sortOrder}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to fetch orders");
      }
      return res.json();
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const payload = {
        ...data,
        lotId: Number(data.lotId),
        bookedQty: Number(data.bookedQty),
        advanceAmount: Number(data.advanceAmount),
      };

      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to create order");
      }
      return api.orders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.lots.list.path] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: number } & Partial<UpdateOrderInput>) => {
      const url = buildUrl(api.orders.update.path, { id });

      const res = await fetch(url, {
        method: api.orders.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to update order");
      }
      return api.orders.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.lots.list.path] }); // Update may affect stock
    },
  });
}
