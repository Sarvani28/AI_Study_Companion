import { z } from "zod";

/*
 * ============================================================
 * TUTOR RESPONSE
 * ============================================================
 */

export const tutorResponseSchema =
  z.object({
    answer: z.string(),

    grounded: z.boolean(),

    insufficientEvidence: z.boolean(),

    citations: z.array(
      z.object({
        materialId: z.string(),

        materialName: z.string(),

        pageNumber: z
          .number()
          .nullable(),

        quote: z
          .string()
          .nullable(),
      }),
    ),
  });

/*
 * ============================================================
 * CONCEPT EXTRACTION
 * ============================================================
 */

export const conceptExtractionSchema =
  z.object({
    concepts: z.array(
      z.object({
        name: z.string(),

        description: z.string(),
      }),
    ),
  });

/*
 * ============================================================
 * QUIZ QUESTION
 * ============================================================
 */

export const quizQuestionSchema =
  z.object({
    question: z.string(),

    questionType: z.enum([
      "multiple_choice",
      "open_ended",
    ]),

    difficulty: z.enum([
      "easy",
      "medium",
      "hard",
    ]),

    options: z
      .array(z.string())
      .nullable(),

    correctAnswer: z.string(),

    explanation: z.string(),
  });

/*
 * ============================================================
 * OPEN-ENDED EVALUATION
 * ============================================================
 */

export const openEndedEvaluationSchema =
  z.object({
    score: z.number().min(0).max(1),

    isCorrect: z.boolean(),

    feedback: z.string(),

    correctedAnswer: z.string(),
  });