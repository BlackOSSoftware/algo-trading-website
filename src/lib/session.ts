import { apiGet } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

export type SessionUser = {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  phone?: string | null;
  emailVerified?: boolean;
};

export async function fetchSession(
  tokenOverride?: string | null,
  clearFn?: () => void
) {
  const token = tokenOverride ?? getToken();
  if (!token) return null;

  try {
    const data = await apiGet("/api/v1/auth/me", token);
    return (data as { user?: SessionUser }).user ?? null;
  } catch {
    if (clearFn) {
      clearFn();
    } else {
      clearToken();
    }
    return null;
  }
}
