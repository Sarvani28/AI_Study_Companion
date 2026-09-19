import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/ai/ollama";

export type RagChunk = {
  id: string;
  materialId: string;
  projectId: string;
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
  similarity: number;
  materialName: string;
};

export async function searchProjectKnowledge(
  projectId: string,
  question: string
): Promise<RagChunk[]> {
  const supabase = await createClient();

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const { data: project, error: projectError } =
    await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (projectError) {
    throw projectError;
  }

  if (!project) {
    throw new Error("Project not found.");
  }

  const embedding = await generateEmbedding(
    `search_query: ${question}`
  );

  const { data, error } = await supabase.rpc(
    "match_document_chunks",
    {
      query_embedding: embedding,
      match_project_id: projectId,
      match_threshold: 0.35,
      match_count: 8,
    }
  );

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    materialId: row.material_id,
    projectId: row.project_id,
    content: row.content,
    pageNumber: row.page_number,
    chunkIndex: row.chunk_index,
    similarity: Number(row.similarity),
    materialName: row.filename,
  }));
}