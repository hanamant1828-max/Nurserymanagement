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
        let errorMessage = "Login failed";
        try {
          // Attempt to parse structured error message from server
          const error = JSON.parse(responseText);
          errorMessage = error.message || errorMessage;
        } catch (e) {
          // Fallback for non-JSON or generic errors
          if (res.status === 401) {
            errorMessage = "Incorrect username or password. Please check your credentials and try again.";
          } else if (res.status === 403) {
            errorMessage = "Access denied. You do not have permission to log in.";
          } else if (res.status >= 500) {
            errorMessage = "The server is currently having trouble. Please try again in a moment.";
          } else {
            errorMessage = "Connection Error. Please check your internet and try again.";
          }
        }
        throw new Error(errorMessage);
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
