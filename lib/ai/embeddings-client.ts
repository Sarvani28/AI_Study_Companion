const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ??
  "http://127.0.0.1:11434";

const EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL ??
  "nomic-embed-text:latest";

export async function generateEmbedding(
  text: string,
): Promise<number[]> {
  const response =
    await fetch(
      `${OLLAMA_BASE_URL}/api/embeddings`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model:
            EMBEDDING_MODEL,
          prompt: text,
        }),
      },
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Ollama embedding request failed (${response.status}): ${errorText}`,
    );
  }

  const result =
    await response.json();

  if (
    !Array.isArray(
      result.embedding,
    )
  ) {
    throw new Error(
      "Ollama did not return a valid embedding.",
    );
  }

  return result.embedding;
}