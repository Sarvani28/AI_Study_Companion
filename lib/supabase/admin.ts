import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const secretKey =
    process.env
      .SUPABASE_SECRET_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing."
    );
  }

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is missing."
    );
  }

  return createClient(
    url,
    secretKey,
    {
      auth: {
        autoRefreshToken:
          false,
        persistSession:
          false,
      },
    }
  );
}