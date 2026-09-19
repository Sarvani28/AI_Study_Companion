const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ??
  "http://localhost:11434";

const CHAT_MODEL =
  process.env.OLLAMA_CHAT_MODEL ??
  "qwen3:4b";

const EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ??
  "nomic-embed-text";

type OllamaMessage = {
  role:
    | "system"
    | "user"
    | "assistant";
  content: string;
};

type OllamaChatResponse = {
  message?: {
    role: string;
    content: string;
  };
};

type OllamaEmbedResponse = {
  embeddings?: number[][];
};

async function ollamaRequest<T>(
  endpoint: string,
  body: unknown
): Promise<T> {
  const response =
    await fetch(
      `${OLLAMA_BASE_URL}${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Ollama request failed (${response.status}): ${text}`
    );
  }

  return response.json() as Promise<T>;
}

export async function generateEmbedding(
  text: string
): Promise<number[]> {
  const result =
    await ollamaRequest<OllamaEmbedResponse>(
      "/api/embed",
      {
        model: EMBED_MODEL,
        input: text,
      }
    );

  const embedding =
    result.embeddings?.[0];

  if (!embedding) {
    throw new Error(
      "Ollama returned no embedding."
    );
  }

  if (embedding.length !== 768) {
    throw new Error(
      `Expected 768-dimensional embedding, received ${embedding.length}.`
    );
  }

  return embedding;
}

export async function generateChatResponse(
  messages: OllamaMessage[]
): Promise<string> {
  const result =
    await ollamaRequest<OllamaChatResponse>(
      "/api/chat",
      {
        model: CHAT_MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.2,
        },
      }
    );

  const content =
    result.message?.content?.trim();

  if (!content) {
    throw new Error(
      "Ollama returned an empty response."
    );
  }

  return content;
}