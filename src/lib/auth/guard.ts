import dbConnect from "@/lib/db/mongoose";
import User, { type UserRole } from "@/models/User";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { AppError } from "@/lib/api/app-error";

export interface AuthenticatedUser extends SessionUser {
  role: UserRole;
  mustChangePassword: boolean;
  sessionVersion: number;
}

/**
 * Require a session that is still valid in the database: the user exists, is not
 * disabled, and the token's sessionVersion matches. Bumping a user's sessionVersion
 * (password reset/change, disable) therefore ends every existing session immediately.
 *
 * Allows sessions that still need a password change — only use this directly for
 * routes a temporary-password user must reach (e.g. change-password, /me).
 */
export async function requireSession(): Promise<AuthenticatedUser> {
  const session = await getSession();
  if (!session) {
    throw new AppError("Authentication required", 401);
  }

  await dbConnect();
  const user = await User.findById(session.id)
    .select("role mustChangePassword sessionVersion disabledAt")
    .lean();

  if (!user || user.disabledAt || (user.sessionVersion ?? 0) !== (session.sessionVersion ?? 0)) {
    throw new AppError("Authentication required", 401);
  }

  return {
    ...session,
    role: user.role ?? "user",
    mustChangePassword: !!user.mustChangePassword,
    sessionVersion: user.sessionVersion ?? 0,
  };
}

/**
 * Require authentication — throws 401 if the session is invalid, or 403 if the
 * user must change their temporary password first.
 * Use in API route handlers and server actions.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await requireSession();
  if (user.mustChangePassword) {
    throw new AppError("Password change required", 403);
  }
  return user;
}

/**
 * Require an authenticated admin — throws 401/403 otherwise.
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new AppError("Forbidden", 403);
  }
  return user;
}
