import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type User } from "@shared/schema";
import { z } from "zod";

type LoginInput = z.infer<typeof api.auth.login.input>;

export function useUser() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return await res.json() as User | null;
    },
    retry: false,
    staleTime: Infinity, // Don't re-fetch user unless invalidated
  });

  return { user, isLoading, error };
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      
      const responseText = await res.text();
      console.log("Login response:", responseText);

      if (!res.ok) {
        try {
          const error = JSON.parse(responseText);
          throw new Error(error.message || "Login failed");
        } catch (e) {
          throw new Error(`Login failed: ${res.status} ${res.statusText}`);
        }
      }
      
      try {
        return JSON.parse(responseText) as User;
      } catch (e) {
        throw new Error("Invalid JSON response from server");
      }
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
    onError: (error: Error) => {
      // Error handled by components
    }
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.clear(); // Clear all cache on logout
    },
  });
}
