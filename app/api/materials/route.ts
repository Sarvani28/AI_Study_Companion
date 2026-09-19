import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

export async function POST(
  request: Request
) {
  const supabase =
    await createClient();

  try {
    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const formData =
      await request.formData();

    const projectId =
      String(
        formData.get(
          "projectId"
        ) ?? ""
      ).trim();

    const file =
      formData.get("file");

    if (!projectId) {
      return NextResponse.json(
        {
          error:
            "projectId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "PDF file is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.type !==
      "application/pdf"
    ) {
      return NextResponse.json(
        {
          error:
            "Only PDF files are supported.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "PDF must be smaller than 20 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: project,
      error:
        projectError,
    } =
      await supabase
        .from("projects")
        .select("id")
        .eq(
          "id",
          projectId
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (projectError) {
      throw projectError;
    }

    if (!project) {
      return NextResponse.json(
        {
          error:
            "Project not found.",
        },
        {
          status: 404,
        }
      );
    }

    const safeFilename =
      file.name
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        )
        .slice(0, 120);

    const materialId =
      crypto.randomUUID();

    const storagePath =
      `${user.id}/${projectId}/${materialId}-${safeFilename}`;

    const fileBuffer =
      Buffer.from(
        await file.arrayBuffer()
      );

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from("materials")
        .upload(
          storagePath,
          fileBuffer,
          {
            contentType:
              "application/pdf",
            upsert: false,
          }
        );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: material,
      error:
        materialError,
    } =
      await supabase
        .from("materials")
        .insert({
          id: materialId,
          project_id:
            projectId,
          user_id:
            user.id,
          filename:
            file.name,
          storage_path:
            storagePath,
          mime_type:
            "application/pdf",
          status:
            "queued",
        })
        .select()
        .single();

    if (materialError) {
      await supabase.storage
        .from("materials")
        .remove([
          storagePath,
        ]);

      throw materialError;
    }

    await inngest.send({
      name:
        "material/uploaded",
      data: {
        materialId:
          material.id,
        projectId,
        userId:
          user.id,
      },
    });

    await supabase
      .from("activity_events")
      .insert({
        user_id:
          user.id,
        project_id:
          projectId,
        event_type:
          "MATERIAL_UPLOADED",
        metadata: {
          materialId:
            material.id,
          filename:
            file.name,
        },
      });

    return NextResponse.json(
      {
        material,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Material upload error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload failed.",
      },
      {
        status: 500,
      }
    );
  }
}