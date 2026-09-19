export type TextPage = {
  pageNumber: number;
  text: string;
};

export type DocumentChunk = {
  content: string;
  pageNumber: number;
  chunkIndex: number;
};

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 250;

export function chunkPages(
  pages: TextPage[],
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  let globalChunkIndex = 0;

  for (const page of pages) {
    const normalized =
      page.text
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    if (!normalized) {
      continue;
    }

    let start = 0;

    while (start < normalized.length) {
      const end = Math.min(
        start + CHUNK_SIZE,
        normalized.length,
      );

      const content =
        normalized.slice(start, end).trim();

      if (content.length >= 80) {
        chunks.push({
          content,
          pageNumber: page.pageNumber,
          chunkIndex: globalChunkIndex,
        });

        globalChunkIndex += 1;
      }

      if (end >= normalized.length) {
        break;
      }

      start =
        end - CHUNK_OVERLAP;
    }
  }

  return chunks;
}