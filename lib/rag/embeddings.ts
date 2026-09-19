import {
  EMBEDDING_MODEL,
  openai,
} from "@/lib/ai/client";

export async function createEmbeddings(
  texts: string[],
) {
  if (texts.length === 0) {
    return [];
  }

  const response =
    await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      encoding_format: "float",
    });

  return response.data
    .sort(
      (a, b) => a.index - b.index,
    )
    .map(
      (item) => item.embedding,
    );
}