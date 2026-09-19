import type { TutorResponse } from "@/lib/validation/tutor";
import type { RagChunk } from "./search";

export function validateTutorCitations(
  response: TutorResponse,
  chunks: RagChunk[]
): TutorResponse {
  if (response.insufficientEvidence) {
    return {
      ...response,
      grounded: false,
      citations: [],
    };
  }

  const validCitations = response.citations.filter(
    (citation) => {
      return chunks.some((chunk) => {
        const sameMaterial =
          chunk.materialId === citation.materialId;

        const sameName =
          chunk.materialName === citation.materialName;

        const samePage =
          chunk.pageNumber === citation.pageNumber;

        return (
          sameMaterial &&
          sameName &&
          samePage
        );
      });
    }
  );

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