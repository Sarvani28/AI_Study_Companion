import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function sanitizeFilename(filename: string) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 150);
}

export async function POST(request: Request) {
  try {
    /*
     * ==========================================================
     * SUPABASE SERVER CLIENT
     * ==========================================================
     */

    const supabase = await createClient();

    /*
     * ==========================================================
     * AUTHENTICATION
     * ==========================================================
     */

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * ==========================================================
     * READ FORM DATA
     * ==========================================================
     */

    const formData = await request.formData();

    const projectIdValue =
      formData.get("projectId");

    const fileValue =
      formData.get("file");

    if (
      typeof projectIdValue !== "string" ||
      !projectIdValue
    ) {
      return NextResponse.json(
        {
          error: "Project ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          error: "A PDF file is required.",
        },
        {
          status: 400,
        },
      );
    }

    const projectId = projectIdValue;
    const file = fileValue;

    /*
     * ==========================================================
     * FILE VALIDATION
     * ==========================================================
     */

    if (file.size === 0) {
      return NextResponse.json(
        {
          error: "The uploaded file is empty.",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "The PDF is too large. Maximum file size is 20 MB.",
        },
        {
          status: 400,
        },
      );
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        {
          error: "Only PDF files are supported.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ==========================================================
     * VERIFY PROJECT OWNERSHIP
     * ==========================================================
     *
     * RLS also protects this query, but explicitly checking
     * user_id makes the authorization intent clear.
     */

    const {
      data: project,
      error: projectError,
    } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError) {
      console.error(
        "Project lookup error:",
        projectError,
      );

      return NextResponse.json(
        {
          error: "Unable to verify project.",
        },
        {
          status: 500,
        },
      );
    }

    if (!project) {
      return NextResponse.json(
        {
          error:
            "Project not found or you do not have access to it.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * ==========================================================
     * CREATE STORAGE PATH
     * ==========================================================
     *
     * Example:
     *
     * user-id/project-id/uuid-rag-architecture.pdf
     */

    const safeFilename =
      sanitizeFilename(file.name);

    const uniqueFilename =
      `${crypto.randomUUID()}-${safeFilename}`;

    const storagePath =
      `${user.id}/${projectId}/${uniqueFilename}`;

    /*
     * ==========================================================
     * UPLOAD TO SUPABASE STORAGE
     * ==========================================================
     *
     * IMPORTANT:
     *
     * We use the authenticated Supabase client here instead
     * of the secret/service-role client.
     */

    const fileBuffer =
      Buffer.from(
        await file.arrayBuffer(),
      );

    const {
      error: uploadError,
    } = await supabase.storage
      .from("materials")
      .upload(
        storagePath,
        fileBuffer,
        {
          contentType:
            "application/pdf",

          upsert: false,
        },
      );

    if (uploadError) {
      console.error(
        "Storage upload error:",
        uploadError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to upload the PDF to storage.",
          details: uploadError.message,
        },
        {
          status: 500,
        },
      );
    }

    /*
     * ==========================================================
     * CREATE MATERIAL DATABASE RECORD
     * ==========================================================
     */

    const {
      data: material,
      error: materialError,
    } =
      await supabase
        .from("materials")
        .insert({
          project_id: projectId,
          user_id: user.id,
          filename: file.name,
          storage_path: storagePath,
          mime_type: "application/pdf",
          status: "queued",
        })
        .select(
          "id, filename, mime_type, status, page_count, error_message, created_at, updated_at",
        )
        .single();

    /*
     * ==========================================================
     * CLEAN UP STORAGE IF DB INSERT FAILS
     * ==========================================================
     */

    if (materialError) {
      console.error(
        "Material insert error:",
        materialError,
      );

      await supabase.storage
        .from("materials")
        .remove([storagePath]);

      return NextResponse.json(
        {
          error:
            "The file was uploaded, but the material record could not be created.",
          details: materialError.message,
        },
        {
          status: 500,
        },
      );
    }
    /*
        * ==========================================================
        * TRIGGER BACKGROUND PROCESSING
        * ==========================================================
        */

        try {
        await inngest.send({
            name: "material/uploaded",

            data: {
            materialId: material.id,
            projectId,
            userId: user.id,
            },
        });
        } catch (eventError) {
        console.error(
            "Unable to send material processing event:",
            eventError,
        );

        /*
        * Keep the material record so the failure is visible
        * rather than silently deleting the uploaded document.
        */

        await supabase
            .from("materials")
            .update({
            status: "failed",
            error_message:
                "The material was uploaded, but background processing could not be started.",
            })
            .eq(
            "id",
            material.id,
            );

        return NextResponse.json(
            {
            error:
                "The PDF was uploaded, but background processing could not be started.",
            },
            {
            status: 500,
            },
        );
        }

    /*
     * ==========================================================
     * SUCCESS
     * ==========================================================
     */

    return NextResponse.json(
      {
        success: true,
        material,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Material upload API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected upload error.",
      },
      {
        status: 500,
      },
    );
  }
}