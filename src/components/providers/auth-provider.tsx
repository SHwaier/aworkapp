"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { installSessionFetchInterceptor, refreshSession } from "@/lib/auth/client-session";

// Install at module load (not in an effect) so it is in place before any child
// component's effects start fetching — child effects run before the provider's.
installSessionFetchInterceptor();

// Must stay below the access token lifetime (JWT_EXPIRES_IN) so active users
// never hit an expired token on page navigation
const BACKGROUND_REFRESH_MS = 1000 * 60 * 10;

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const userRef = useRef(user);

  // Keep ref in sync with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Check session on mount — runs once only
  useEffect(() => {
    async function checkSession() {
      try {
        let res = await fetch("/api/auth/me");
        if (res.status === 401) {
          // Attempt to refresh the session
          if (await refreshSession()) {
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
  }, []); // Empty deps — mount only

  // Background token refresh (separate effect)
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      // Use ref to read current user without re-triggering effect
      if (userRef.current) {
        await refreshSession();
      }
    }, BACKGROUND_REFRESH_MS);

    return () => clearInterval(refreshInterval);
  }, []); // Empty deps — interval set once

  const login = useCallback(
    async (email: string, password: string, redirectTo = "/dashboard") => {
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
      router.push(data.data.user.mustChangePassword ? "/change-password" : redirectTo);
    },
    [router]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.errors?.map((e: { message: string }) => e.message).join(", ") ||
            data.error ||
            "Failed to change password"
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
    <AuthContext.Provider value={{ user, isLoading, login, changePassword, logout }}>
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
