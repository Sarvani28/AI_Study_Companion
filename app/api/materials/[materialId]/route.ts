import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    materialId: string;
  }>;
};

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const { materialId } = await context.params;

  const { data: material, error: materialError } =
    await supabase
      .from("materials")
      .select("id, storage_path")
      .eq("id", materialId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (materialError) {
    console.error(materialError);

    return NextResponse.json(
      {
        error: "Failed to find material.",
      },
      {
        status: 500,
      },
    );
  }

  if (!material) {
    return NextResponse.json(
      {
        error: "Material not found.",
      },
      {
        status: 404,
      },
    );
  }

  const { error: storageError } = await supabase.storage
    .from("materials")
    .remove([material.storage_path]);

  if (storageError) {
    console.error(storageError);

    return NextResponse.json(
      {
        error: "Failed to delete material file.",
      },
      {
        status: 500,
      },
    );
  }

  const { error: deleteError } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error(deleteError);

    return NextResponse.json(
      {
        error: "Failed to delete material record.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    success: true,
  });
}