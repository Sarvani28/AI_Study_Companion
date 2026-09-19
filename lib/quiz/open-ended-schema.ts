import { z } from "zod";

export const openEndedEvaluationSchema =
  z.object({
    score: z
      .number()
      .min(0)
      .max(1),

    understanding: z.enum([
      "Excellent",
      "Good",
      "Partial",
      "Limited",
      "Incorrect",
    ]),

    correct: z.boolean(),

    concepts_covered: z
      .array(z.string()),

    missing_concepts: z
      .array(z.string()),

    feedback: z
      .string()
      .min(1),
  });

export type OpenEndedEvaluation =
  z.infer<
    typeof openEndedEvaluationSchema
  >;