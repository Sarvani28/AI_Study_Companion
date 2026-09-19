import type {
  RagChunk,
} from "./search";

import type {
  TutorResponse,
} from "@/lib/validation/tutor";

export function validateTutorCitations(
  response: TutorResponse,
  chunks: RagChunk[],
): TutorResponse {
  /*
   * If the model says there is insufficient
   * evidence, don't allow citations through.
   */
  if (
    response.insufficientEvidence
  ) {
    return {
      ...response,
      grounded: false,
      citations: [],
    };
  }

  const validCitations =
    response.citations.filter(
      (citation) => {
        const matchingChunks =
          chunks.filter(
            (chunk) =>
              chunk.materialId ===
                citation.materialId &&
              chunk.filename ===
                citation.materialName &&
              (
                citation.pageNumber ===
                  null ||
                chunk.pageNumber ===
                  citation.pageNumber
              ),
          );

        return (
          matchingChunks.length > 0
        );
      },
    );

  /*
   * If the model claimed grounded evidence
   * but none of its citations match the
   * retrieved sources, don't treat the answer
   * as grounded.
   */
  if (
    response.grounded &&
    validCitations.length === 0
  ) {
    return {
      ...response,
      grounded: false,
      insufficientEvidence: true,
      citations: [],
    };
  }

  return {
    ...response,
    citations: validCitations,
  };
}