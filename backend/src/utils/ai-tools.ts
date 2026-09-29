import { google } from "googleapis";
import { sendWhatsAppConfirmation } from "./whatsapp-msg.js";

const BUSINESS_NAME = process.env.BUSINESS_NAME ?? "My Business";
const TIMEZONE = process.env.TIMEZONE ?? "Asia/Kolkata";
const UTC_OFFSET = process.env.UTC_OFFSET ?? "+05:30";
const SLOT_DURATION_MINUTES = Number(process.env.SLOT_DURATION_MINUTES ?? 30);
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "";

export const functionDeclarations = [
    {
        name: "check_availability",
        description: "Check if a date and time slot is free on the calendar.",
        parameters: {
            type: "OBJECT",
            properties: {
                date: { type: "STRING", description: "Date in YYYY-MM-DD format" },
                time: { type: "STRING", description: "Time in 24-hour HH:mm format" },
            },
            required: ["date", "time"],
        },
    },
    {
        name: "book_slot",
        description: "Book the slot after the caller has explicitly confirmed date, time, name and phone.",
        parameters: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "Caller full name" },
                phone: { type: "STRING", description: "Phone number for WhatsApp confirmation, with country code e.g. 919876543210" },
                date: { type: "STRING", description: "Date in YYYY-MM-DD format" },
                time: { type: "STRING", description: "Time in 24-hour HH:mm format" },
                service: { type: "STRING", description: "Reason / service for the appointment" },
            },
            required: ["name", "phone", "date", "time", "service"],
        },
    },
    {
        name: "end_call",
        description: "Call this AFTER you have said goodbye, when the conversation is finished, to hang up.",
        parameters: { type: "OBJECT", properties: {} },
    },
];

export function buildSystemInstruction(callerNumber: string) {
    const now = new Date();
    const today = now.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
    const weekday = now.toLocaleDateString("en-US", { timeZone: TIMEZONE, weekday: "long" });

    return `
You are a friendly phone receptionist for "${BUSINESS_NAME}". A caller wants to book an appointment.
Today's date is ${today} (${weekday}), timezone ${TIMEZONE}. Use this to convert words like "kal", "parso", "next Monday" into exact dates.
${callerNumber ? `The caller is calling from ${callerNumber}. You may offer to send the WhatsApp confirmation on this same number, or ask for a different one.` : ""}

Speak in natural Hinglish (Hindi + English mix) like an Indian receptionist. If the caller speaks pure English or pure Hindi, match them.
Keep every reply SHORT (1-2 sentences). This is a live phone call.

Flow:
1. Greet, ask what service/reason they need.
2. Get preferred date and time.
3. Call check_availability. Never guess availability.
4. If free: confirm the details, get their name and WhatsApp number, then call book_slot only after they clearly say yes.
5. If busy: ask for another time and check again. Do not invent slots.
6. After booking, say a WhatsApp confirmation is on its way, say goodbye, then call end_call.
`.trim();
}

function getCalendarClient() {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured");
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    return google.calendar({ version: "v3", auth });
}

function slotRange(date: string, time: string) {
    const start = new Date(`${date}T${time}:00${UTC_OFFSET}`);
    const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60000);
    return { start, end };
}

async function checkAvailability(date: string, time: string) {
    const calendar = getCalendarClient();
    const { start, end } = slotRange(date, time);
    const calendarId = GOOGLE_CALENDAR_ID;

    if (!calendarId) {
        throw new Error("GOOGLE_CALENDAR_ID is not configured");
    }

    const res = await calendar.freebusy.query({
        requestBody: {
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            timeZone: TIMEZONE,
            items: [{ id: calendarId }],
        },
    });

    const busy = res.data.calendars?.[calendarId]?.busy ?? [];
    return { available: busy.length === 0, date, time };
}

async function bookSlot({ name, phone, date, time, service }: { name: string; phone: string; date: string; time: string; service: string }) {
    const calendar = getCalendarClient();
    const { start, end } = slotRange(date, time);
    const calendarId = GOOGLE_CALENDAR_ID;

    if (!calendarId) {
        throw new Error("GOOGLE_CALENDAR_ID is not configured");
    }

    const availability = await checkAvailability(date, time);
    if (!availability.available) return { success: false, reason: "slot_no_longer_available" };

    const event = await calendar.events.insert({
        calendarId,
        requestBody: {
            summary: `${name} - ${service}`,
            description: `Booked via AI phone agent.\nClient phone: ${phone}\nService: ${service}`,
            start: { dateTime: start.toISOString(), timeZone: TIMEZONE },
            end: { dateTime: end.toISOString(), timeZone: TIMEZONE },
        },
    });

    return { success: true, eventId: event.data.id, date, time };
}

export async function executeFunctionCall(call: unknown, session: any) {
    const typedCall = (typeof call === "object" && call !== null ? call : {}) as { name?: string; args?: Record<string, any> };
    const { name, args = {} } = typedCall;
    console.log(`[tool] ${name ?? "unknown"}`, args);

    try {
        if (name === "check_availability") return await checkAvailability(String(args.date ?? ""), String(args.time ?? ""));

        if (name === "book_slot") {
            const result = await bookSlot({
                name: String(args.name ?? ""),
                phone: String(args.phone ?? ""),
                date: String(args.date ?? ""),
                time: String(args.time ?? ""),
                service: String(args.service ?? ""),
            });
            if (result.success) sendWhatsAppConfirmation({ name: args.name, phone: args.phone, date: args.date, time: args.time, service: args.service });
            return result;
        }

        if (name === "end_call") {
            session.endAfterTurn = true;
            return { ok: true };
        }
    } catch (err: any) {
        console.error(`[tool] ${name} failed:`, err.message);
        return { error: err.message };
    }

    return { error: `Unknown function ${name ?? "unknown"}` };
}