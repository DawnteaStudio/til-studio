import { z } from "zod";

export const theoryResearchSchema = z.object({
  title: z.string(),
  concept: z.string(),
  keyPoints: z.array(z.string()),
  cautions: z.array(z.string()),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});

export type TheoryResearchResult = z.infer<typeof theoryResearchSchema>;
