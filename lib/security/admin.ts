import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email?: string;
};

export async function requireAdmin(): Promise<AdminUser> {
  const adminSupabase = await createClient();

  /*
   * 1. Verify authentication
   */
  const {
    data: {
      user,
    },
  } = await adminSupabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  /*
   * 2. Read the user's server-side profile
   */
  const {
    data: profile,
    error,
  } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Admin role lookup failed:",
      error
    );

    throw new Error(
      "AUTHORIZATION_CHECK_FAILED"
    );
  }

  /*
   * 3. Verify admin role
   */
  if (profile?.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  /*
   * 4. Return only trusted server-side
   *    user information
   */
  return {
    id: user.id,
    email: user.email,
  };
}