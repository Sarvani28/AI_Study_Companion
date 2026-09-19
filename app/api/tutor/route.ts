import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateChatResponse } from "@/lib/ai/ollama";

import {
  tutorResponseSchema,
  type TutorResponse,
} from "@/lib/validation/tutor";

import {
  searchProjectKnowledge,
} from "@/lib/rag/search";

import {
  buildTutorContext,
  buildTutorSystemPrompt,
} from "@/lib/rag/tutor-prompt";

import {
  validateTutorCitations,
} from "@/lib/rag/validate-tutor-response";

type TutorRequest = {
  projectId: string;
  question: string;
  conversationId?: string | null;
};

export async function POST(
  request: Request
) {
  const startedAt = Date.now();

  const supabase = await createClient();

  try {
    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as TutorRequest;

    const projectId =
      body.projectId?.trim();

    const question =
      body.question?.trim();

    if (!projectId) {
      return NextResponse.json(
        {
          error: "projectId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!question) {
      return NextResponse.json(
        {
          error: "question is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (question.length > 4000) {
      return NextResponse.json(
        {
          error:
            "Question is too long. Maximum 4000 characters.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: project,
      error: projectError,
    } = await supabase
      .from("projects")
      .select(
        "id, name, learning_goal"
      )
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError) {
      throw projectError;
    }

    if (!project) {
      return NextResponse.json(
        {
          error: "Project not found.",
        },
        {
          status: 404,
        }
      );
    }

    const chunks =
      await searchProjectKnowledge(
        projectId,
        question
      );

    if (chunks.length === 0) {
      const response: TutorResponse = {
        answer:
            "I don't have enough evidence in this project's learning materials to answer that reliably.\n\nTry asking me about a concept covered in your uploaded materials.",
        grounded: false,
        insufficientEvidence: true,
        citations: [],
      };

      const conversationId =
        await saveConversation({
          supabase,
          userId: user.id,
          projectId,
          conversationId:
            body.conversationId,
          question,
          response,
        });

      await logAiRequest({
        supabase,
        userId: user.id,
        projectId,
        latencyMs:
          Date.now() - startedAt,
        success: true,
        model:
          process.env.OLLAMA_CHAT_MODEL ??
          "qwen3:4b",
      });

      return NextResponse.json({
        ...response,
        conversationId,
      });
    }

    const context =
      buildTutorContext(chunks);

    const systemPrompt =
      buildTutorSystemPrompt();

    const userPrompt = `
PROJECT:
${project.name}

LEARNING GOAL:
${project.learning_goal ?? "Not specified"}

RETRIEVED STUDY MATERIAL:

${context}

STUDENT QUESTION:

${question}

Answer the student's question using only the
retrieved study material.

Return valid JSON only.
`;

    const rawResponse =
      await generateChatResponse([
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ]);

    const parsedJson =
      extractJson(rawResponse);

    const parsed =
      tutorResponseSchema.parse(
        parsedJson
      );

    const validated =
      validateTutorCitations(
        parsed,
        chunks
      );

    const conversationId =
      await saveConversation({
        supabase,
        userId: user.id,
        projectId,
        conversationId:
          body.conversationId,
        question,
        response: validated,
      });

    await supabase
      .from("activity_events")
      .insert({
        user_id: user.id,
        project_id: projectId,
        event_type: "TUTOR_MESSAGE",
        metadata: {
          grounded:
            validated.grounded,
          insufficientEvidence:
            validated.insufficientEvidence,
          citationCount:
            validated.citations.length,
        },
      });

    await logAiRequest({
      supabase,
      userId: user.id,
      projectId,
      latencyMs:
        Date.now() - startedAt,
      success: true,
      model:
        process.env.OLLAMA_CHAT_MODEL ??
        "qwen3:4b",
    });

    return NextResponse.json({
      ...validated,
      conversationId,
      sources: chunks.map(
        (chunk) => ({
          materialId:
            chunk.materialId,
          materialName:
            chunk.materialName,
          pageNumber:
            chunk.pageNumber,
          similarity:
            chunk.similarity,
        })
      ),
    });
  } catch (error) {
    console.error(
      "Tutor API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tutor request failed.",
      },
      {
        status: 500,
      }
    );
  }
}

function extractJson(
  text: string
): unknown {
  const cleaned =
    text
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start =
      cleaned.indexOf("{");

    const end =
      cleaned.lastIndexOf("}");

    if (
      start === -1 ||
      end === -1 ||
      end <= start
    ) {
      throw new Error(
        "Ollama returned invalid JSON."
      );
    }

    return JSON.parse(
      cleaned.slice(
        start,
        end + 1
      )
    );
  }
}

async function saveConversation({
  supabase,
  userId,
  projectId,
  conversationId,
  question,
  response,
}: {
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;
  userId: string;
  projectId: string;
  conversationId?: string | null;
  question: string;
  response: TutorResponse;
}) {
  let id =
    conversationId ?? null;

  if (id) {
    const { data } =
      await supabase
        .from("conversations")
        .select("id")
        .eq("id", id)
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();

    if (!data) {
      id = null;
    }
  }

  if (!id) {
    const { data, error } =
      await supabase
        .from("conversations")
        .insert({
          project_id: projectId,
          user_id: userId,
          title:
            question.slice(0, 80),
        })
        .select("id")
        .single();

    if (error) {
      throw error;
    }

    id = data.id;
  }

  const { error: userMessageError } =
    await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        project_id: projectId,
        user_id: userId,
        role: "user",
        content: question,
      });

  if (userMessageError) {
    throw userMessageError;
  }

  const { error: assistantError } =
    await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        project_id: projectId,
        user_id: userId,
        role: "assistant",
        content: response.answer,
      });

  if (assistantError) {
    throw assistantError;
  }

  await supabase
    .from("conversations")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  return id;
}

async function logAiRequest({
  supabase,
  userId,
  projectId,
  latencyMs,
  success,
  model,
}: {
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;
  userId: string;
  projectId: string;
  latencyMs: number;
  success: boolean;
  model: string;
}) {
  await supabase
    .from("ai_requests")
    .insert({
      user_id: userId,
      project_id: projectId,
      feature: "tutor",
      model,
      prompt_version: "local-v1",
      latency_ms: latencyMs,
      success,
    });
}