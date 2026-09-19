import { NextResponse } from "next/server";
import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";
import { searchProjectKnowledge } from "@/lib/rag/search";
import {
  buildGroundedPrompt,
} from "@/lib/rag/prompt";

const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY,
});

const TUTOR_MODEL =
  "gpt-4o-mini";

export async function POST(
  request: Request,
) {
  try {
    /*
     * ==========================================================
     * AUTH
     * ==========================================================
     */

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "You must be logged in.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * ==========================================================
     * REQUEST
     * ==========================================================
     */

    const body =
      await request.json();

    const projectId =
      typeof body.projectId ===
      "string"
        ? body.projectId
        : "";

    const question =
      typeof body.question ===
      "string"
        ? body.question.trim()
        : "";

    if (!projectId) {
      return NextResponse.json(
        {
          error:
            "Project ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!question) {
      return NextResponse.json(
        {
          error:
            "Question is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (question.length > 4000) {
      return NextResponse.json(
        {
          error:
            "Question is too long.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ==========================================================
     * RAG SEARCH
     * ==========================================================
     */

    const chunks =
      await searchProjectKnowledge(
        projectId,
        question,
      );

    /*
     * ==========================================================
     * INSUFFICIENT EVIDENCE
     * ==========================================================
     */

    if (!chunks.length) {
      return NextResponse.json({
        answer:
          "I don't have enough evidence in this project's materials to answer that.",

        citations: [],

        grounded: false,
      });
    }

    /*
     * ==========================================================
     * GROUNDED PROMPT
     * ==========================================================
     */

    const {
      systemPrompt,
      userPrompt,
      citations,
    } =
      buildGroundedPrompt(
        question,
        chunks,
      );

    /*
     * ==========================================================
     * LLM
     * ==========================================================
     */

    const completion =
      await openai.chat.completions.create(
        {
          model: TUTOR_MODEL,

          temperature: 0.2,

          messages: [
            {
              role: "system",
              content:
                systemPrompt,
            },

            {
              role: "user",
              content:
                userPrompt,
            },
          ],
        },
      );

    const answer =
      completion.choices[0]
        ?.message?.content?.trim();

    if (!answer) {
      throw new Error(
        "The tutor returned an empty response.",
      );
    }

    /*
     * ==========================================================
     * SAVE AI OBSERVABILITY
     * ==========================================================
     */

    await supabase
      .from("ai_requests")
      .insert({
        user_id: user.id,
        project_id: projectId,
        feature: "tutor",
        model: TUTOR_MODEL,
        prompt_version:
          "rag-tutor-v1",
        input_tokens:
          completion.usage
            ?.prompt_tokens ?? null,
        output_tokens:
          completion.usage
            ?.completion_tokens ?? null,
        latency_ms: null,
        success: true,
      });

    /*
     * ==========================================================
     * SUCCESS
     * ==========================================================
     */

    return NextResponse.json({
      answer,

      citations,

      grounded: true,

      sources: chunks.map(
        (chunk) => ({
          id: chunk.id,
          filename:
            chunk.filename,
          pageNumber:
            chunk.page_number,
          similarity:
            chunk.similarity,
        }),
      ),
    });
  } catch (error) {
    console.error(
      "Tutor API error:",
      error,
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
      },
    );
  }
}