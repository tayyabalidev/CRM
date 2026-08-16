import { z } from "zod";

import { currencies } from "@/lib/constants/currencies";
import { isUuid } from "@/lib/utils/ids";
import { staffInviteRoles } from "@/types/index";

export const profileSettingsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().max(40),
  timezone: z.string().min(1, "Choose a timezone"),
});

export const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(2, "Enter a workspace name").max(80),
  logoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || /^https?:\/\//i.test(value), "Enter an http(s) image URL"),
});

export const currencySettingsSchema = z.object({
  currency: z
    .string()
    .length(3, "Choose a currency")
    .refine((value) => currencies.some((currency) => currency.code === value), "Choose a currency"),
});

export const timezoneSettingsSchema = z.object({
  timezone: z.string().min(1, "Choose a timezone"),
});

export const notificationSettingsSchema = z.object({
  notifyInApp: z.boolean(),
  notifyEmail: z.boolean(),
});

export const teamInviteSchema = z.object({
  role: z.enum(staffInviteRoles),
});

export const teamRoleSchema = z.object({
  memberId: z.string().refine((value) => isUuid(value), "Team member not found"),
  role: z.enum(staffInviteRoles),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;
export type CurrencySettingsInput = z.infer<typeof currencySettingsSchema>;
export type TimezoneSettingsInput = z.infer<typeof timezoneSettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type TeamInviteInput = z.infer<typeof teamInviteSchema>;
export type TeamRoleInput = z.infer<typeof teamRoleSchema>;
