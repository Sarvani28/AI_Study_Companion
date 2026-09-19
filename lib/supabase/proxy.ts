import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            }
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  /*
   * Important:
   *
   * Do not use getSession() here for authorization.
   * getClaims() verifies the token.
   */
  const { data } =
  await supabase.auth.getClaims();

  const user = data?.claims?.sub;

  const pathname = request.nextUrl.pathname;

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/update-password") ||
    pathname.startsWith("/auth");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();

    url.pathname = "/login";
    url.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(url);
  }

  if (
    user &&
    (pathname === "/login" ||
      pathname === "/signup")
  ) {
    const url = request.nextUrl.clone();

    url.pathname = "/dashboard";

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}