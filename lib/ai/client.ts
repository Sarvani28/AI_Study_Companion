import {
  generateChatResponse,
} from "@/lib/ai/ollama";

import {
  recordAIRequest,
} from "@/lib/ai/observability";

export type AIRequest = {
  feature: string;
  userId?: string;
  projectId?: string;
  system?: string;
  prompt: string;
};

export type AIResponse = {
  text: string;
  model: string;
  latencyMs: number;
};

export async function generate(
  request: AIRequest,
): Promise<AIResponse> {
  const startedAt =
    Date.now();

  const model =
    process.env
      .OLLAMA_CHAT_MODEL ??
    "llama3.2:latest";

  try {
    const text =
      await generateChatResponse({
        system:
          request.system ?? "",
        prompt:
          request.prompt,
      });

    const latencyMs =
      Date.now() -
      startedAt;

    await recordAIRequest({
      feature:
        request.feature,

      userId:
        request.userId,

      projectId:
        request.projectId,

      model,

      latencyMs,

      success: true,
    });

    return {
      text,
      model,
      latencyMs,
    };
  } catch (error) {
    const latencyMs =
      Date.now() -
      startedAt;

    await recordAIRequest({
      feature:
        request.feature,

      userId:
        request.userId,

      projectId:
        request.projectId,

      model,

      latencyMs,

      success: false,

      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown AI error",
    });

    throw error;
  }
}