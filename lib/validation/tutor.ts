import { z } from "zod";

export const tutorCitationSchema = z.object({
  materialId: z.string().uuid(),
  materialName: z.string(),
  pageNumber: z.number().int().positive().nullable(),
  quote: z.string().optional(),
});

export const tutorResponseSchema = z.object({
  answer: z.string().min(1),
  grounded: z.boolean(),
  insufficientEvidence: z.boolean(),
  citations: z.array(tutorCitationSchema),
});

export type TutorResponse = z.infer<
  typeof tutorResponseSchema
>;

export type TutorCitation = z.infer<
  typeof tutorCitationSchema
>;