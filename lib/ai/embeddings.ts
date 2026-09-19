import {
  EMBEDDING_MODEL,
  openai,
} from "@/lib/ai/client";

export async function generateEmbedding(
  text: string,
) {
  const response =
    await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

  return response.data[0].embedding;
}

export async function generateEmbeddings(
  texts: string[],
) {
  if (texts.length === 0) {
    return [];
  }

  const response =
    await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}