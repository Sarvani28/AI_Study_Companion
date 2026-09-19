const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ??
  "http://localhost:11434";

const OLLAMA_CHAT_MODEL =
  process.env.OLLAMA_CHAT_MODEL ??
  "llama3.2:latest";

const OLLAMA_EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ??
  "nomic-embed-text";

const OLLAMA_TIMEOUT_MS = 180_000;

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
  response?: string;
};

type OllamaEmbeddingResponse = {
  embedding?: number[];
  embeddings?: number[][];
};

async function ollamaRequest<T>(
  path: string,
  body: unknown
): Promise<T> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, OLLAMA_TIMEOUT_MS);

  try {
    const response =
      await fetch(
        `${OLLAMA_BASE_URL}${path}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            body
          ),

          signal:
            controller.signal,

          cache: "no-store",
        }
      );

    const text =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `Ollama request failed (${response.status}): ${text}`
      );
    }

    try {
      return JSON.parse(
        text
      ) as T;
    } catch {
      throw new Error(
        "Ollama returned invalid JSON."
      );
    }
  } catch (error) {
    if (
      error instanceof
        DOMException &&
      error.name ===
        "AbortError"
    ) {
      throw new Error(
        `Ollama request timed out after ${
          OLLAMA_TIMEOUT_MS / 1000
        } seconds.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateChatResponse(
  messages: OllamaMessage[]
): Promise<string> {
  const result =
    await ollamaRequest<OllamaChatResponse>(
      "/api/chat",
      {
        model:
          OLLAMA_CHAT_MODEL,

        messages,

        stream: false,

        options: {
          temperature: 0.2,

          /*
           * Keep quiz generation
           * reasonably sized.
           */
          num_predict: 3000,
        },

        format: "json",
      }
    );

  const content =
    result.message?.content ??
    result.response ??
    "";

  if (!content.trim()) {
    throw new Error(
      "Ollama returned an empty response."
    );
  }

  return content;
}

export async function generateEmbedding(
  input: string
): Promise<number[]> {
  const result =
    await ollamaRequest<OllamaEmbeddingResponse>(
      "/api/embed",
      {
        model:
          OLLAMA_EMBED_MODEL,

        input,
      }
    );

  const embedding =
    result.embeddings?.[0] ??
    result.embedding;

  if (
    !embedding ||
    embedding.length === 0
  ) {
    throw new Error(
      "Ollama returned an empty embedding."
    );
  }

  return embedding;
}