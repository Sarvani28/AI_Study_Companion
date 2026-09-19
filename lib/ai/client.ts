import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const EMBEDDING_MODEL =
  "text-embedding-3-small";

export const TUTOR_MODEL =
  "gpt-4.1-mini";

export const QUIZ_MODEL =
  "gpt-4.1-mini";