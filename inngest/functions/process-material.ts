import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateChatResponse,
  generateEmbedding,
} from "@/lib/ai/ollama";
import {
  extractText,
  getDocumentProxy,
} from "unpdf";

type PdfPage = {
  pageNumber: number;
  text: string;
};

type DocumentChunk = {
  content: string;
  pageNumber: number;
  chunkIndex: number;
};

type Concept = {
  name: string;
  description: string;
};

/**
 * Normalize extracted PDF text.
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Split PDF pages into overlapping chunks.
 */
function buildChunks(
  pages: PdfPage[]
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  const chunkSize = 1400;
  const overlap = 250;

  let chunkIndex = 0;

  for (const page of pages) {
    const text = normalizeText(page.text);

    if (!text) {
      continue;
    }

    let start = 0;

    while (start < text.length) {
      const end = Math.min(
        start + chunkSize,
        text.length
      );

      const content = text
        .slice(start, end)
        .trim();

      if (content) {
        chunks.push({
          content,
          pageNumber: page.pageNumber,
          chunkIndex,
        });

        chunkIndex += 1;
      }

      if (end >= text.length) {
        break;
      }

      start = end - overlap;
    }
  }

  return chunks;
}

/**
 * Parse concepts returned by Ollama.
 */
function parseConcepts(
  response: string
): Concept[] {
  const cleaned = response
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed?.concepts)) {
      return [];
    }

    return parsed.concepts
      .filter((concept: unknown) => {
        if (
          typeof concept !== "object" ||
          concept === null
        ) {
          return false;
        }

        const item =
          concept as Record<string, unknown>;

        return (
          typeof item.name === "string" &&
          typeof item.description === "string"
        );
      })
      .slice(0, 15)
      .map(
        (
          concept: {
            name: string;
            description: string;
          }
        ) => ({
          name: concept.name
            .trim()
            .slice(0, 200),

          description: concept.description
            .trim()
            .slice(0, 500),
        })
      );
  } catch {
    return [];
  }
}

/**
 * Process uploaded PDF.
 *
 * Pipeline:
 *
 * Upload
 * ↓
 * Supabase Storage
 * ↓
 * Inngest
 * ↓
 * PDF text extraction
 * ↓
 * Chunking
 * ↓
 * Ollama embeddings
 * ↓
 * pgvector
 * ↓
 * Concept extraction
 * ↓
 * Ready
 */
export const processMaterial =
  inngest.createFunction(
    {
      id: "process-material",

      triggers: {
        event: "material/uploaded",
      },

      retries: 3,
    },

    async ({ event, step }) => {
      const {
        materialId,
        projectId,
        userId,
      } = event.data;

      /*
       * --------------------------------------------------
       * STEP 1
       * Load material
       * --------------------------------------------------
       */

      const material =
        await step.run(
          "load-material",
          async () => {
            const supabase =
              createAdminClient();

            const { data, error } =
              await supabase
                .from("materials")
                .select(
                  `
                    id,
                    project_id,
                    user_id,
                    filename,
                    storage_path,
                    status
                  `
                )
                .eq(
                  "id",
                  materialId
                )
                .eq(
                  "project_id",
                  projectId
                )
                .eq(
                  "user_id",
                  userId
                )
                .single();

            if (error) {
              throw error;
            }

            if (!data) {
              throw new Error(
                "Material not found."
              );
            }

            return data;
          }
        );

      /*
       * --------------------------------------------------
       * STEP 2
       * Mark material as processing
       * --------------------------------------------------
       */

      await step.run(
        "mark-processing",
        async () => {
          const supabase =
            createAdminClient();

          const { error } =
            await supabase
              .from("materials")
              .update({
                status: "processing",
                error_message: null,
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                materialId
              );

          if (error) {
            throw error;
          }
        }
      );

      /*
       * --------------------------------------------------
       * STEP 3
       * Download PDF and extract text
       * --------------------------------------------------
       */

      const extracted =
        await step.run(
          "extract-pdf-text",
          async () => {
            const supabase =
              createAdminClient();

            const { data, error } =
              await supabase.storage
                .from("materials")
                .download(
                  material.storage_path
                );

            if (error) {
              throw error;
            }

            if (!data) {
              throw new Error(
                "Could not download PDF from Supabase Storage."
              );
            }

            const arrayBuffer =
              await data.arrayBuffer();

            const pdfBytes =
              new Uint8Array(
                arrayBuffer
              );

            /*
             * Create PDF document.
             */
            const pdf =
              await getDocumentProxy(
                pdfBytes
              );

            /*
             * IMPORTANT:
             *
             * extractText() returns:
             *
             * {
             *   totalPages,
             *   text
             * }
             *
             * When mergePages=false,
             * text is string[].
             */
            const {
              totalPages,
              text,
            } =
              await extractText(
                pdf,
                {
                  mergePages: false,
                }
              );

            /*
             * Make absolutely sure we received
             * per-page text.
             */
            if (
              !Array.isArray(text)
            ) {
              throw new Error(
                "PDF extraction did not return per-page text."
              );
            }

            const normalizedPages: PdfPage[] =
              text.map(
                (
                  pageText,
                  index
                ) => ({
                  pageNumber:
                    index + 1,

                  text:
                    typeof pageText ===
                    "string"
                      ? pageText
                      : String(
                          pageText
                        ),
                })
              );

            return {
              pageCount:
                totalPages,

              pages:
                normalizedPages,
            };
          }
        );

      /*
       * --------------------------------------------------
       * STEP 4
       * Save page count
       * --------------------------------------------------
       */

      await step.run(
        "update-page-count",
        async () => {
          const supabase =
            createAdminClient();

          const { error } =
            await supabase
              .from("materials")
              .update({
                page_count:
                  extracted.pageCount,

                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                materialId
              );

          if (error) {
            throw error;
          }
        }
      );

      /*
       * --------------------------------------------------
       * STEP 5
       * Create chunks
       * --------------------------------------------------
       */

      const chunks =
        await step.run(
          "chunk-document",
          async () => {
            return buildChunks(
              extracted.pages
            );
          }
        );

      if (chunks.length === 0) {
        throw new Error(
          "No readable text was found in this PDF."
        );
      }

      /*
       * --------------------------------------------------
       * STEP 6
       * Remove old chunks
       * --------------------------------------------------
       */

      await step.run(
        "clear-existing-chunks",
        async () => {
          const supabase =
            createAdminClient();

          const { error } =
            await supabase
              .from("document_chunks")
              .delete()
              .eq(
                "material_id",
                materialId
              );

          if (error) {
            throw error;
          }
        }
      );

      /*
       * --------------------------------------------------
       * STEP 7
       * Generate local embeddings
       *
       * Ollama:
       * nomic-embed-text
       *
       * Dimension:
       * 768
       * --------------------------------------------------
       */

      await step.run(
        "generate-and-store-embeddings",
        async () => {
          const supabase =
            createAdminClient();

          const batchSize = 10;

          for (
            let i = 0;
            i < chunks.length;
            i += batchSize
          ) {
            const batch =
              chunks.slice(
                i,
                i + batchSize
              );

            const rows = [];

            for (const chunk of batch) {
              const embedding =
                await generateEmbedding(
                  `search_document: ${chunk.content}`
                );

              if (
                embedding.length !==
                768
              ) {
                throw new Error(
                  `Invalid embedding dimension. Expected 768, received ${embedding.length}.`
                );
              }

              rows.push({
                material_id:
                  materialId,

                project_id:
                  projectId,

                user_id:
                  userId,

                content:
                  chunk.content,

                page_number:
                  chunk.pageNumber,

                chunk_index:
                  chunk.chunkIndex,

                embedding,

                metadata: {
                  filename:
                    material.filename,

                  page:
                    chunk.pageNumber,
                },
              });
            }

            const { error } =
              await supabase
                .from(
                  "document_chunks"
                )
                .insert(rows);

            if (error) {
              throw error;
            }
          }
        }
      );

      /*
       * --------------------------------------------------
       * STEP 8
       * Extract concepts using Ollama
       * --------------------------------------------------
       */

      const concepts =
        await step.run(
          "extract-concepts",
          async () => {
            const combinedText =
              chunks
                .slice(0, 20)
                .map(
                  (chunk) =>
                    chunk.content
                )
                .join("\n\n");

            if (!combinedText) {
              return [];
            }

            const response =
              await generateChatResponse(
                [
                  {
                    role: "system",

                    content: `
You are an educational concept extractor.

Read the supplied study material and identify
important concepts that a student should learn.

Return JSON only.

Use exactly this structure:

{
  "concepts": [
    {
      "name": "Concept name",
      "description": "Short educational description"
    }
  ]
}

Rules:

- Return at most 15 concepts.
- Only use concepts actually present in the material.
- Do not invent information.
- Keep names short.
- Keep descriptions concise.
`,
                  },

                  {
                    role: "user",

                    content:
                      combinedText,
                  },
                ]
              );

            return parseConcepts(
              response
            );
          }
        );

      /*
       * --------------------------------------------------
       * STEP 9
       * Store concepts
       * --------------------------------------------------
       */

      await step.run(
        "store-concepts",
        async () => {
          const supabase =
            createAdminClient();

          for (const concept of concepts) {
            const {
              error,
            } =
              await supabase
                .from("concepts")
                .upsert(
                  {
                    project_id:
                      projectId,

                    name:
                      concept.name,

                    description:
                      concept.description,
                  },
                  {
                    onConflict:
                      "project_id,name",
                  }
                );

            if (error) {
              throw error;
            }
          }
        }
      );

      /*
       * --------------------------------------------------
       * STEP 10
       * Mark material ready
       * --------------------------------------------------
       */

      await step.run(
        "mark-ready",
        async () => {
          const supabase =
            createAdminClient();

          const { error } =
            await supabase
              .from("materials")
              .update({
                status: "ready",

                error_message:
                  null,

                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                materialId
              );

          if (error) {
            throw error;
          }
        }
      );

      /*
       * --------------------------------------------------
       * STEP 11
       * Record activity
       * --------------------------------------------------
       */

      await step.run(
        "record-material-processed",
        async () => {
          const supabase =
            createAdminClient();

          const { error } =
            await supabase
              .from(
                "activity_events"
              )
              .insert({
                user_id:
                  userId,

                project_id:
                  projectId,

                event_type:
                  "MATERIAL_PROCESSED",

                metadata: {
                  materialId,

                  filename:
                    material.filename,

                  pageCount:
                    extracted.pageCount,

                  chunkCount:
                    chunks.length,

                  conceptCount:
                    concepts.length,
                },
              });

          if (error) {
            throw error;
          }
        }
      );

      /*
       * --------------------------------------------------
       * DONE
       * --------------------------------------------------
       */

      return {
        success: true,

        materialId,

        filename:
          material.filename,

        pageCount:
          extracted.pageCount,

        chunkCount:
          chunks.length,

        conceptCount:
          concepts.length,
      };
    }
  );