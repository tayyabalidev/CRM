import { z } from "zod";

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(80),
  workspaceName: z.string().trim().min(2, "Enter a workspace name").max(80),
  currency: z.string().length(3, "Choose a currency"),
  timezone: z.string().min(1, "Choose a timezone"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
