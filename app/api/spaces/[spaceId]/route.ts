import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    spaceId: string;
  }>;
};

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const { spaceId } = await context.params;

    if (!spaceId) {
      return NextResponse.json(
        {
          error: "Space ID is required.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json(
        {
          error: userError.message,
        },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        { status: 401 },
      );
    }

    /*
     * Verify that this space belongs to
     * the currently authenticated user.
     */
    const { data: space, error: spaceError } =
      await supabase
        .from("spaces")
        .select("id")
        .eq("id", spaceId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (spaceError) {
      return NextResponse.json(
        {
          error: spaceError.message,
        },
        { status: 500 },
      );
    }

    if (!space) {
      return NextResponse.json(
        {
          error: "Space not found or you do not have access to it.",
        },
        { status: 404 },
      );
    }

    /*
     * Delete the space.
     *
     * This will succeed only if the database allows
     * the space to be deleted without violating
     * related foreign-key constraints.
     */
    const { error: deleteError } =
      await supabase
        .from("spaces")
        .delete()
        .eq("id", spaceId)
        .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "Space deletion failed:",
        deleteError,
      );

      return NextResponse.json(
        {
          error: deleteError.message,
          code: deleteError.code ?? null,
          details: deleteError.details ?? null,
          hint: deleteError.hint ?? null,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      spaceId,
    });
  } catch (error) {
    console.error(
      "Unexpected space deletion error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}