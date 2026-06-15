"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        let res = await fetch("/api/auth/me");
        if (res.status === 401) {
          // Attempt to refresh the session
          const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
          if (refreshRes.ok) {
            res = await fetch("/api/auth/me");
          }
        }

        if (res.ok) {
          const data = await res.json();
          setUser(data.data.user);
        }
      } catch {
        // Not authenticated — that's fine
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();

    // Background token refresh every 1 hour to prevent session interruption
    const refreshInterval = setInterval(
      async () => {
        if (user) {
          try {
            await fetch("/api/auth/refresh", { method: "POST" });
          } catch {
            // Ignore background errors
          }
        }
      },
      1000 * 60 * 60
    );

    return () => clearInterval(refreshInterval);
  }, [user]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      setUser(data.data.user);
      router.push("/dashboard");
    },
    [router]
  );

  const register = useCallback(
    async (name: string, email: string, password: string, confirmPassword: string) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.errors?.map((e: { message: string }) => e.message).join(", ") ||
            data.error ||
            "Registration failed"
        );
      }

      setUser(data.data.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
