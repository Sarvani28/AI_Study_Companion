import { createClient } from "@/lib/supabase/server";

type AIUsage = {
  userId?: string;
  projectId?: string;

  feature: string;
  model: string;
  promptVersion?: string;

  inputTokens?: number;
  outputTokens?: number;

  latencyMs: number;

  success: boolean;

  errorMessage?: string;
};

export async function recordAIRequest(
  usage: AIUsage
) {
  try {
    const supabase =
      await createClient();

    await supabase
      .from("ai_requests")
      .insert({
        user_id:
          usage.userId ?? null,

        project_id:
          usage.projectId ??
          null,

        feature:
          usage.feature,

        model:
          usage.model,

        prompt_version:
          usage.promptVersion ??
          null,

        input_tokens:
          usage.inputTokens ??
          null,

        output_tokens:
          usage.outputTokens ??
          null,

        latency_ms:
          usage.latencyMs,

        success:
          usage.success,

        error_message:
          usage.errorMessage ??
          null,
      });
  } catch (error) {
    /*
     * Observability must never break
     * the primary AI request.
     */
    console.error(
      "AI observability error:",
      error
    );
  }
}