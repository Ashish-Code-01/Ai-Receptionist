import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format");

export const businessSchema = z.object({
    businessName: z.string().trim().min(2).max(150),
    services: z.array(z.string().trim().min(1)).min(1),
    workingHours: z.object({
        days: z.array(z.number().int().min(0).max(6)).min(1),
        start: time,
        end: time,
    }).refine(w => w.start < w.end, { message: "start must be before end" }),
    slotDurationMinutes: z.number().int().refine(v => [15, 30, 45, 60].includes(v)),
    timezone: z.string().default("Asia/Kolkata"),
    voice: z.string().default("Kore"),
    customInstructions: z.string().max(2000).optional().nullable(),
});

export const businessUpdateSchema = businessSchema.partial();

export const whatsappCredentialsSchema = z.object({
    whatsappPhoneNumberId: z.string().trim().regex(/^\d{8,20}$/, "Phone number ID should be 8 to 20 digits."),
    whatsappToken: z.string().trim().min(20, "Access token must be at least 20 characters."),
});