import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL =
  "text-embedding-3-small";

export type RagChunk = {
  id: string;
  materialId: string;
  projectId: string;
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
  similarity: number;
  filename: string;
};

export async function searchProjectKnowledge(
  projectId: string,
  question: string,
): Promise<RagChunk[]> {
  const supabase =
    await createClient();

  /*
   * 1. Authenticate the user.
   */
  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Unauthorized",
    );
  }

  /*
   * 2. Verify project ownership.
   *
   * This is an additional application-level
   * authorization check.
   */
  const { data: project, error: projectError } =
    await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (projectError) {
    throw new Error(
      `Failed to verify project: ${projectError.message}`,
    );
  }

  if (!project) {
    throw new Error(
      "Project not found.",
    );
  }

  /*
   * 3. Generate the embedding for the
   * user's question.
   */
  const embeddingResponse =
    await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });

  const queryEmbedding =
    embeddingResponse.data[0]?.embedding;

  if (!queryEmbedding) {
    throw new Error(
      "Failed to generate question embedding.",
    );
  }

  /*
   * 4. Search pgvector.
   *
   * IMPORTANT:
   *
   * match_project_id is the CURRENT project.
   *
   * The SQL function also checks auth.uid().
   */
  const {
    data,
    error,
  } = await supabase.rpc(
    "match_document_chunks",
    {
      query_embedding:
        queryEmbedding,

      match_project_id:
        projectId,

      match_threshold: 0.72,

      match_count: 8,
    },
  );

  if (error) {
    throw new Error(
      `RAG search failed: ${error.message}`,
    );
  }

  return (data ?? []).map(
    (row) => ({
      id: row.id,
      materialId:
        row.material_id,
      projectId:
        row.project_id,
      content:
        row.content,
      pageNumber:
        row.page_number,
      chunkIndex:
        row.chunk_index,
      similarity:
        Number(row.similarity),
      filename:
        row.filename,
    }),
  );
}