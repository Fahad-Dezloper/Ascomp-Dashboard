"use client";

import { createContext, useContext, type ReactNode } from "react";
import { authClient } from "./auth-client";

interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role?: "ADMIN" | "FIELD_WORKER";
  accessLevel?: "FULL" | "READ_ONLY";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  const login = async (email: string, password: string) => {
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      throw result.error;
    }

    return result.data;
  };

  // console.log("session here", session)

  const logout = async () => {
    // Sign out from better-auth FIRST (clears cookies properly)
    await authClient.signOut();

    // Clear specific localStorage items (not all, to avoid interfering with auth)
    localStorage.removeItem("workflowData");
    localStorage.removeItem("workflowStep");
    localStorage.removeItem("siteInChargeSignature");
    localStorage.removeItem("engineerSignature");
    localStorage.removeItem("serviceReports");

    // Redirect to login page with full page refresh
    window.location.href = "/login";
  };

  const user: User | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: (session.user as any).role as
          | "ADMIN"
          | "FIELD_WORKER"
          | undefined,
        accessLevel: (session.user as any).accessLevel as
          | "FULL"
          | "READ_ONLY"
          | undefined,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isPending,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
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
