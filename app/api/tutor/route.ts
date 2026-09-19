import { NextResponse } from "next/server";
import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";
import { searchProjectKnowledge, type RagChunk } from "@/lib/rag/search";
import { buildTutorContext, buildTutorSystemPrompt } from "@/lib/rag/tutor-prompt";
import {
  tutorResponseSchema,
  type TutorResponse,
} from "@/lib/validation/tutor";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TUTOR_MODEL = "gpt-4o-mini";
const PROMPT_VERSION = "tutor-v1";

type TutorRequestBody = {
  projectId?: string;
  question?: string;
  conversationId?: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
  learning_goal: string | null;
};

type ConversationRow = {
  id: string;
  project_id: string;
  user_id: string;
};

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Save the user question and assistant response.
 *
 * If the client provides a conversationId, we first verify that the
 * conversation belongs to the current user and project.
 */
async function saveConversation({
  supabase,
  userId,
  projectId,
  question,
  response,
  conversationId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  projectId: string;
  question: string;
  response: TutorResponse;
  conversationId?: string | null;
}) {
  let activeConversationId = conversationId ?? null;

  // ------------------------------------------------------------
  // 1. Validate an existing conversation if one was supplied
  // ------------------------------------------------------------

  if (activeConversationId) {
    const { data: conversation, error: conversationError } =
      await supabase
        .from("conversations")
        .select("id, project_id, user_id")
        .eq("id", activeConversationId)
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle<ConversationRow>();

    if (conversationError) {
      throw new Error(
        `Failed to validate conversation: ${conversationError.message}`,
      );
    }

    // If the conversation does not belong to the user/project,
    // do not use it.
    if (!conversation) {
      activeConversationId = null;
    }
  }

  // ------------------------------------------------------------
  // 2. Create a new conversation when necessary
  // ------------------------------------------------------------

  if (!activeConversationId) {
    const title =
      question.length > 80
        ? `${question.slice(0, 77)}...`
        : question;

    const { data: newConversation, error: createConversationError } =
      await supabase
        .from("conversations")
        .insert({
          project_id: projectId,
          user_id: userId,
          title,
        })
        .select("id")
        .single();

    if (createConversationError || !newConversation) {
      throw new Error(
        `Failed to create conversation: ${
          createConversationError?.message ?? "Unknown error"
        }`,
      );
    }

    activeConversationId = newConversation.id;
  }

  // ------------------------------------------------------------
  // 3. Save the user's message
  // ------------------------------------------------------------

  const { error: userMessageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: activeConversationId,
      project_id: projectId,
      user_id: userId,
      role: "user",
      content: question,
    });

  if (userMessageError) {
    throw new Error(
      `Failed to save user message: ${userMessageError.message}`,
    );
  }

  // ------------------------------------------------------------
  // 4. Save the assistant response
  //
  // We store the answer text in the messages table.
  // Citation metadata is stored separately in the response API,
  // so the message remains clean and readable.
  // ------------------------------------------------------------

  const { error: assistantMessageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: activeConversationId,
      project_id: projectId,
      user_id: userId,
      role: "assistant",
      content: response.answer,
    });

  if (assistantMessageError) {
    throw new Error(
      `Failed to save assistant message: ${assistantMessageError.message}`,
    );
  }

  // ------------------------------------------------------------
  // 5. Update conversation timestamp
  // ------------------------------------------------------------

  const { error: updateConversationError } = await supabase
    .from("conversations")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", activeConversationId)
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (updateConversationError) {
    throw new Error(
      `Failed to update conversation: ${updateConversationError.message}`,
    );
  }

  return activeConversationId;
}

/**
 * Validate citations returned by the LLM against the chunks that were
 * actually retrieved from the project knowledge base.
 *
 * This is an important security/grounding layer:
 * the model is not allowed to invent material IDs, filenames, or pages.
 */
function validateTutorCitations(
  response: TutorResponse,
  chunks: RagChunk[],
): TutorResponse {
  // If the model says there is insufficient evidence,
  // there should be no citations.
  if (response.insufficientEvidence) {
    return {
      ...response,
      grounded: false,
      citations: [],
    };
  }

  const validCitations = response.citations.filter((citation) => {
    return chunks.some((chunk) => {
      const sameMaterial = chunk.materialId === citation.materialId;

      if (!sameMaterial) {
        return false;
      }

      const sameMaterialName =
        chunk.filename === citation.materialName;

      if (!sameMaterialName) {
        return false;
      }

      // A citation with null page is only valid if the retrieved
      // chunk itself does not have a page number.
      if (citation.pageNumber === null) {
        return chunk.pageNumber === null;
      }

      return chunk.pageNumber === citation.pageNumber;
    });
  });

  // A grounded answer without any valid citations is not considered
  // safely grounded.
  if (response.grounded && validCitations.length === 0) {
    return {
      ...response,
      grounded: false,
      insufficientEvidence: true,
      citations: [],
    };
  }

  return {
    ...response,
    citations: validCitations,
  };
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  let userId: string | null = null;
  let projectId: string | null = null;

  try {
    // ============================================================
    // 1. Validate environment
    // ============================================================

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is missing");

      return jsonResponse(
        {
          error: "AI service is not configured.",
        },
        500,
      );
    }

    // ============================================================
    // 2. Authenticate the user
    // ============================================================

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(
        {
          error: "You must be signed in to use the AI Tutor.",
        },
        401,
      );
    }

    userId = user.id;

    // ============================================================
    // 3. Parse request body
    // ============================================================

    let body: TutorRequestBody;

    try {
      body = (await request.json()) as TutorRequestBody;
    } catch {
      return jsonResponse(
        {
          error: "Invalid JSON request body.",
        },
        400,
      );
    }

    projectId = body.projectId ?? null;

    const question =
      typeof body.question === "string"
        ? body.question.trim()
        : "";

    const conversationId =
      typeof body.conversationId === "string"
        ? body.conversationId
        : null;

    // ============================================================
    // 4. Validate input
    // ============================================================

    if (!projectId) {
      return jsonResponse(
        {
          error: "projectId is required.",
        },
        400,
      );
    }

    if (!question) {
      return jsonResponse(
        {
          error: "question is required.",
        },
        400,
      );
    }

    if (question.length > 4000) {
      return jsonResponse(
        {
          error: "Question must be 4000 characters or less.",
        },
        400,
      );
    }

    // ============================================================
    // 5. Verify project ownership
    //
    // This prevents a user from asking the Tutor questions about
    // another user's project.
    // ============================================================

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, learning_goal")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle<ProjectRow>();

    if (projectError) {
      console.error("Project lookup failed:", projectError);

      return jsonResponse(
        {
          error: "Failed to verify project.",
        },
        500,
      );
    }

    if (!project) {
      return jsonResponse(
        {
          error: "Project not found.",
        },
        404,
      );
    }

    // ============================================================
    // 6. Search the project knowledge base
    //
    // searchProjectKnowledge:
    // - authenticates the user
    // - generates an embedding
    // - searches pgvector
    // - filters results by project
    // - filters results by user
    // ============================================================

    const chunks = await searchProjectKnowledge(
      projectId,
      question,
    );

    // ============================================================
    // 7. Handle insufficient evidence BEFORE calling the LLM
    //
    // This is intentional.
    //
    // If there is no relevant retrieved evidence, the Tutor should
    // not attempt to answer from its general model knowledge.
    // ============================================================

    if (chunks.length === 0) {
      const insufficientResponse: TutorResponse = {
        answer:
          "I couldn't find enough information in your project materials to answer that question.",
        grounded: false,
        insufficientEvidence: true,
        citations: [],
      };

      const savedConversationId = await saveConversation({
        supabase,
        userId: user.id,
        projectId,
        question,
        response: insufficientResponse,
        conversationId,
      });

      // Log the Tutor request.
      await supabase.from("ai_requests").insert({
        user_id: user.id,
        project_id: projectId,
        feature: "tutor",
        model: TUTOR_MODEL,
        prompt_version: PROMPT_VERSION,
        latency_ms: Date.now() - startedAt,
        success: true,
      });

      // Record activity.
      await supabase.from("activity_events").insert({
        user_id: user.id,
        project_id: projectId,
        event_type: "TUTOR_MESSAGE",
        metadata: {
          grounded: false,
          insufficient_evidence: true,
          citation_count: 0,
        },
      });

      return jsonResponse({
        ...insufficientResponse,
        conversationId: savedConversationId,
        sources: [],
      });
    }

    // ============================================================
    // 8. Build the Tutor prompt
    // ============================================================

    const systemPrompt = buildTutorSystemPrompt();

    const context = buildTutorContext(chunks);

    const userPrompt = `
Project:
${project.name}

Learning goal:
${project.learning_goal ?? "Not specified"}

Student question:
${question}

Retrieved project material:
${context}
`;

    // ============================================================
    // 9. Ask OpenAI for a strict structured response
    // ============================================================

    const completion = await openai.chat.completions.create({
      model: TUTOR_MODEL,
      temperature: 0.2,

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],

      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tutor_response",
          strict: true,
          schema: {
            type: "object",

            additionalProperties: false,

            properties: {
              answer: {
                type: "string",
              },

              grounded: {
                type: "boolean",
              },

              insufficientEvidence: {
                type: "boolean",
              },

              citations: {
                type: "array",

                items: {
                  type: "object",

                  additionalProperties: false,

                  properties: {
                    materialId: {
                      type: "string",
                    },

                    materialName: {
                      type: "string",
                    },

                    pageNumber: {
                      anyOf: [
                        {
                          type: "integer",
                        },
                        {
                          type: "null",
                        },
                      ],
                    },

                    quote: {
                      type: "string",
                    },
                  },

                  required: [
                    "materialId",
                    "materialName",
                    "pageNumber",
                    "quote",
                  ],
                },
              },
            },

            required: [
              "answer",
              "grounded",
              "insufficientEvidence",
              "citations",
            ],
          },
        },
      },
    });

    // ============================================================
    // 10. Read OpenAI response
    // ============================================================

    const choice = completion.choices[0];

    if (!choice) {
      throw new Error("OpenAI returned no completion choice.");
    }

    // Some OpenAI responses can contain a refusal instead of content.
    if (choice.message.refusal) {
      throw new Error(
        `Tutor model refused the request: ${choice.message.refusal}`,
      );
    }

    const content = choice.message.content;

    if (!content) {
      throw new Error("Tutor model returned empty content.");
    }

    // ============================================================
    // 11. Parse JSON
    // ============================================================

    let parsedResponse: unknown;

    try {
      parsedResponse = JSON.parse(content);
    } catch {
      console.error(
        "Tutor returned invalid JSON:",
        content,
      );

      throw new Error(
        "Tutor returned an invalid structured response.",
      );
    }

    // ============================================================
    // 12. Validate against our Zod schema
    // ============================================================

    const validatedResponse =
      tutorResponseSchema.safeParse(parsedResponse);

    if (!validatedResponse.success) {
      console.error(
        "Tutor response failed Zod validation:",
        validatedResponse.error.flatten(),
      );

      throw new Error(
        "Tutor returned an invalid response format.",
      );
    }

    // ============================================================
    // 13. Validate citations against actual retrieved chunks
    // ============================================================

    const safeResponse = validateTutorCitations(
      validatedResponse.data,
      chunks,
    );

    // ============================================================
    // 14. Save conversation
    // ============================================================

    const savedConversationId = await saveConversation({
      supabase,
      userId: user.id,
      projectId,
      question,
      response: safeResponse,
      conversationId,
    });

    // ============================================================
    // 15. AI observability
    // ============================================================

    const usage = completion.usage;

    await supabase.from("ai_requests").insert({
      user_id: user.id,
      project_id: projectId,
      feature: "tutor",
      model: TUTOR_MODEL,
      prompt_version: PROMPT_VERSION,
      input_tokens: usage?.prompt_tokens ?? null,
      output_tokens: usage?.completion_tokens ?? null,
      latency_ms: Date.now() - startedAt,
      success: true,
    });

    // ============================================================
    // 16. Activity event
    // ============================================================

    await supabase.from("activity_events").insert({
      user_id: user.id,
      project_id: projectId,
      event_type: "TUTOR_MESSAGE",
      metadata: {
        grounded: safeResponse.grounded,
        insufficient_evidence:
          safeResponse.insufficientEvidence,
        citation_count: safeResponse.citations.length,
        model: TUTOR_MODEL,
      },
    });

    // ============================================================
    // 17. Return response to frontend
    // ============================================================

    return jsonResponse({
      answer: safeResponse.answer,
      grounded: safeResponse.grounded,
      insufficientEvidence:
        safeResponse.insufficientEvidence,
      citations: safeResponse.citations,
      conversationId: savedConversationId,

      // Useful for the frontend if you later want to show
      // source cards using retrieved chunks.
      sources: safeResponse.citations,
    });
  } catch (error) {
    // ============================================================
    // 18. Error handling
    // ============================================================

    console.error("Tutor API error:", error);

    // Try to log failed AI requests.
    //
    // This is deliberately best-effort. If the database itself
    // is unavailable, we should still return an API error.
    try {
      const supabase = await createClient();

      await supabase.from("ai_requests").insert({
        user_id: userId,
        project_id: projectId,
        feature: "tutor",
        model: TUTOR_MODEL,
        prompt_version: PROMPT_VERSION,
        latency_ms: Date.now() - startedAt,
        success: false,
        error_message:
          error instanceof Error
            ? error.message
            : "Unknown Tutor API error",
      });
    } catch (loggingError) {
      console.error(
        "Failed to log Tutor API error:",
        loggingError,
      );
    }

    return jsonResponse(
      {
        error:
          "The AI Tutor could not process your question right now. Please try again.",
      },
      500,
    );
  }
}