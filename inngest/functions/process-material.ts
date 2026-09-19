import OpenAI from "openai";
import {
  extractText,
  getDocumentProxy,
} from "unpdf";

import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL =
  "text-embedding-3-small";

const CONCEPT_MODEL =
  "gpt-4o-mini";

const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 250;

type MaterialEventData = {
  materialId: string;
  projectId: string;
  userId: string;
};

type PageText = {
  pageNumber: number;
  text: string;
};

type DocumentChunk = {
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
};

type ExtractedConcept = {
  name: string;
  description: string;
};

function normalizeText(
  text: string,
): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/*
 * Build chunks while preserving page numbers.
 *
 * This is important for our later RAG citations.
 */
function buildChunks(
  pages: PageText[],
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  let chunkIndex = 0;

  for (const page of pages) {
    const text =
      normalizeText(page.text);

    if (!text) {
      continue;
    }

    let start = 0;

    while (start < text.length) {
      const end = Math.min(
        start + CHUNK_SIZE,
        text.length,
      );

      const content = text
        .slice(start, end)
        .trim();

      if (content.length > 0) {
        chunks.push({
          content,
          pageNumber:
            page.pageNumber,
          chunkIndex,
        });

        chunkIndex += 1;
      }

      if (end >= text.length) {
        break;
      }

      start = Math.max(
        end - CHUNK_OVERLAP,
        start + 1,
      );
    }
  }

  return chunks;
}

export const processMaterial =
  inngest.createFunction(
    {
      id: "process-material",

      retries: 3,

      triggers: {
        event: "material/uploaded",
      },
    },

    async ({ event, step }) => {
      const eventData =
        event.data as MaterialEventData;

      const {
        materialId,
        projectId,
        userId,
      } = eventData;

      /*
       * Server-side Supabase admin client.
       */
      const supabaseAdmin =
        createAdminClient();

      /*
       * STEP 1
       *
       * Load material.
       */
      const material =
        await step.run(
          "load-material",
          async () => {
            const { data, error } =
              await supabaseAdmin
                .from("materials")
                .select("*")
                .eq(
                  "id",
                  materialId,
                )
                .eq(
                  "project_id",
                  projectId,
                )
                .eq(
                  "user_id",
                  userId,
                )
                .single();

            if (error) {
              throw new Error(
                `Failed to load material: ${error.message}`,
              );
            }

            if (!data) {
              throw new Error(
                "Material was not found.",
              );
            }

            return data;
          },
        );

      /*
       * STEP 2
       *
       * Mark material as processing.
       */
      await step.run(
        "mark-processing",
        async () => {
          const { error } =
            await supabaseAdmin
              .from("materials")
              .update({
                status: "processing",
                error_message: null,
              })
              .eq(
                "id",
                materialId,
              )
              .eq(
                "project_id",
                projectId,
              )
              .eq(
                "user_id",
                userId,
              );

          if (error) {
            throw new Error(
              `Failed to mark material as processing: ${error.message}`,
            );
          }
        },
      );

      /*
       * STEP 3
       *
       * Download PDF and extract
       * page-by-page text.
       *
       * unpdf uses its serverless PDF.js
       * build, so there is no separate
       * pdf.worker.mjs file for Next.js
       * to resolve.
       */
      const extractedPdf =
        await step.run(
          "extract-pdf-text",
          async () => {
            const { data, error } =
              await supabaseAdmin.storage
                .from("materials")
                .download(
                  material.storage_path,
                );

            if (error) {
              throw new Error(
                `Failed to download PDF: ${error.message}`,
              );
            }

            if (!data) {
              throw new Error(
                "Supabase returned no PDF file.",
              );
            }

            const arrayBuffer =
              await data.arrayBuffer();

            const pdfBytes =
              new Uint8Array(
                arrayBuffer,
              );

            /*
             * Create a PDF document proxy.
             */
            const pdf =
              await getDocumentProxy(
                pdfBytes,
              );

            /*
             * Extract text from every page.
             *
             * mergePages=false means we receive
             * an array where each item represents
             * one page.
             */
            const result =
              await extractText(
                pdf,
                {
                  mergePages: false,
                },
              );

            const pageTexts =
              Array.isArray(result.text)
                ? result.text
                : [result.text];

            const pages: PageText[] =
              pageTexts.map(
                (
                  pageText,
                  index,
                ) => ({
                  pageNumber:
                    index + 1,

                  text:
                    normalizeText(
                      pageText,
                    ),
                }),
              );

            const usablePages =
              pages.filter(
                (page) =>
                  page.text.length > 0,
              );

            if (
              usablePages.length === 0
            ) {
              throw new Error(
                "The PDF contains no extractable text.",
              );
            }

            return {
              pageCount:
                result.totalPages,

              pages:
                usablePages,

              fullText:
                usablePages
                  .map(
                    (page) =>
                      page.text,
                  )
                  .join("\n\n"),
            };
          },
        );

      /*
       * STEP 4
       *
       * Save page count.
       */
      await step.run(
        "update-page-count",
        async () => {
          const { error } =
            await supabaseAdmin
              .from("materials")
              .update({
                page_count:
                  extractedPdf.pageCount,
              })
              .eq(
                "id",
                materialId,
              )
              .eq(
                "project_id",
                projectId,
              )
              .eq(
                "user_id",
                userId,
              );

          if (error) {
            throw new Error(
              `Failed to update page count: ${error.message}`,
            );
          }
        },
      );

      /*
       * STEP 5
       *
       * Chunk the PDF while retaining
       * page numbers.
       */
      const chunks =
        await step.run(
          "chunk-document",
          async () => {
            return buildChunks(
              extractedPdf.pages,
            );
          },
        );

      if (chunks.length === 0) {
        throw new Error(
          "No chunks were generated from the PDF.",
        );
      }

      /*
       * STEP 6
       *
       * Delete existing chunks.
       */
      await step.run(
        "clear-existing-chunks",
        async () => {
          const { error } =
            await supabaseAdmin
              .from(
                "document_chunks",
              )
              .delete()
              .eq(
                "material_id",
                materialId,
              )
              .eq(
                "project_id",
                projectId,
              )
              .eq(
                "user_id",
                userId,
              );

          if (error) {
            throw new Error(
              `Failed to clear existing chunks: ${error.message}`,
            );
          }
        },
      );

      /*
       * STEP 7
       *
       * Generate embeddings.
       */
      const embeddedChunks =
        await step.run(
          "generate-embeddings",
          async () => {
            const results: Array<
              DocumentChunk & {
                embedding: number[];
              }
            > = [];

            const batchSize = 50;

            for (
              let i = 0;
              i < chunks.length;
              i += batchSize
            ) {
              const batch =
                chunks.slice(
                  i,
                  i + batchSize,
                );

              const response =
                await openai.embeddings.create(
                  {
                    model:
                      EMBEDDING_MODEL,

                    input:
                      batch.map(
                        (chunk) =>
                          chunk.content,
                      ),
                  },
                );

              for (
                let j = 0;
                j < batch.length;
                j += 1
              ) {
                const embedding =
                  response.data[j]
                    ?.embedding;

                if (!embedding) {
                  throw new Error(
                    `Missing embedding for chunk ${i + j}.`,
                  );
                }

                results.push({
                  ...batch[j],
                  embedding,
                });
              }
            }

            return results;
          },
        );

      /*
       * STEP 8
       *
       * Insert document chunks.
       */
      await step.run(
        "insert-document-chunks",
        async () => {
          const batchSize = 100;

          for (
            let i = 0;
            i <
            embeddedChunks.length;
            i += batchSize
          ) {
            const batch =
              embeddedChunks.slice(
                i,
                i + batchSize,
              );

            const rows =
              batch.map(
                (chunk) => ({
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

                  embedding:
                    chunk.embedding,

                  metadata: {
                    filename:
                      material.filename,

                    page:
                      chunk.pageNumber,
                  },
                }),
              );

            const { error } =
              await supabaseAdmin
                .from(
                  "document_chunks",
                )
                .insert(rows);

            if (error) {
              throw new Error(
                `Failed to insert document chunks: ${error.message}`,
              );
            }
          }
        },
      );

      /*
       * STEP 9
       *
       * Extract concepts.
       */
      const concepts =
        await step.run(
          "extract-concepts",
          async () => {
            const textForConcepts =
              extractedPdf.fullText.slice(
                0,
                12000,
              );

            const response =
              await openai.chat.completions.create(
                {
                  model:
                    CONCEPT_MODEL,

                  temperature: 0,

                  response_format: {
                    type: "json_schema",

                    json_schema: {
                      name:
                        "concept_extraction",

                      strict: true,

                      schema: {
                        type: "object",

                        properties: {
                          concepts: {
                            type: "array",

                            items: {
                              type: "object",

                              properties: {
                                name: {
                                  type: "string",
                                },

                                description: {
                                  type: "string",
                                },
                              },

                              required: [
                                "name",
                                "description",
                              ],

                              additionalProperties:
                                false,
                            },
                          },
                        },

                        required: [
                          "concepts",
                        ],

                        additionalProperties:
                          false,
                      },
                    },
                  },

                  messages: [
                    {
                      role: "system",

                      content:
                        "Extract the most important learning concepts from the provided study material. Return concise educational concepts only.",
                    },

                    {
                      role: "user",

                      content:
                        textForConcepts,
                    },
                  ],
                },
              );

            const content =
              response.choices[0]
                ?.message
                ?.content;

            if (!content) {
              return [] as ExtractedConcept[];
            }

            let parsed: {
              concepts: ExtractedConcept[];
            };

            try {
              parsed =
                JSON.parse(
                  content,
                ) as {
                  concepts: ExtractedConcept[];
                };
            } catch {
              throw new Error(
                "The concept extraction model returned invalid JSON.",
              );
            }

            return parsed.concepts;
          },
        );

      /*
       * STEP 10
       *
       * Store concepts.
       */
      await step.run(
        "store-concepts",
        async () => {
          if (
            concepts.length === 0
          ) {
            return;
          }

          const rows =
            concepts.map(
              (concept) => ({
                project_id:
                  projectId,

                name:
                  concept.name.trim(),

                description:
                  concept.description.trim(),
              }),
            );

          const { error } =
            await supabaseAdmin
              .from("concepts")
              .upsert(
                rows,
                {
                  onConflict:
                    "project_id,name",
                },
              );

          if (error) {
            throw new Error(
              `Failed to store concepts: ${error.message}`,
            );
          }
        },
      );

      /*
       * STEP 11
       *
       * Mark material ready.
       */
      await step.run(
        "mark-ready",
        async () => {
          const { error } =
            await supabaseAdmin
              .from("materials")
              .update({
                status: "ready",
                error_message: null,
              })
              .eq(
                "id",
                materialId,
              )
              .eq(
                "project_id",
                projectId,
              )
              .eq(
                "user_id",
                userId,
              );

          if (error) {
            throw new Error(
              `Failed to mark material as ready: ${error.message}`,
            );
          }
        },
      );

      /*
       * Final result.
       */
      return {
        success: true,

        materialId,

        projectId,

        pageCount:
          extractedPdf.pageCount,

        chunkCount:
          embeddedChunks.length,

        conceptCount:
          concepts.length,
      };
    },
  );