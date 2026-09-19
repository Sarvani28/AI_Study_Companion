import { generateEmbedding } from "@/lib/ai/embeddings-client";

export async function createEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding =
      await generateEmbedding(text);

    embeddings.push(embedding);
  }

  return embeddings;
}