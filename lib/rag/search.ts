import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL =
  "text-embedding-3-small";

export type RagChunk = {
  id: string;
  material_id: string;
  project_id: string;
  content: string;
  page_number: number | null;
  chunk_index: number;
  similarity: number;
  filename: string;
};

export async function searchProjectKnowledge(
  projectId: string,
  query: string,
) {
  const supabase =
    await createClient();

  /*
   * ----------------------------------------------------------
   * AUTH
   * ----------------------------------------------------------
   */

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "You must be logged in.",
    );
  }

  /*
   * ----------------------------------------------------------
   * PROJECT AUTHORIZATION
   * ----------------------------------------------------------
   */

  const {
    data: project,
    error: projectError,
  } =
    await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (projectError) {
    throw new Error(
      `Unable to verify project: ${projectError.message}`,
    );
  }

  if (!project) {
    throw new Error(
      "Project not found.",
    );
  }

  /*
   * ----------------------------------------------------------
   * QUERY EMBEDDING
   * ----------------------------------------------------------
   */

  const embeddingResponse =
    await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
      dimensions: 1536,
    });

  const queryEmbedding =
    embeddingResponse.data[0]
      .embedding;

  /*
   * ----------------------------------------------------------
   * PROJECT-SCOPED VECTOR SEARCH
   * ----------------------------------------------------------
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

      match_threshold:
        0.72,

      match_count: 8,
    },
  );

  if (error) {
    throw new Error(
      `Knowledge search failed: ${error.message}`,
    );
  }

  return (data ??
    []) as RagChunk[];
}