import type { TutorResponse } from "@/lib/validation/tutor";
import type { RagChunk } from "./search";

const INSUFFICIENT_EVIDENCE_MESSAGE =
  "I don't have enough evidence in this project's learning materials to answer that reliably.\n\nTry asking me about a concept covered in your uploaded materials.";

export function validateTutorCitations(
  response: TutorResponse,
  chunks: RagChunk[]
): TutorResponse {
  if (
    response.insufficientEvidence ||
    chunks.length === 0
  ) {
    return {
      answer:
        INSUFFICIENT_EVIDENCE_MESSAGE,
      grounded: false,
      insufficientEvidence: true,
      citations: [],
    };
  }

  const validCitations =
    response.citations.filter(
      (citation) =>
        chunks.some(
          (chunk) =>
            chunk.materialId ===
              citation.materialId &&
            chunk.materialName ===
              citation.materialName &&
            chunk.pageNumber ===
              citation.pageNumber
        )
    );

  if (
    response.grounded &&
    validCitations.length === 0
  ) {
    return {
      answer:
        INSUFFICIENT_EVIDENCE_MESSAGE,
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