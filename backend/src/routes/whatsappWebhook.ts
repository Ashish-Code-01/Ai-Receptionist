import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../config/db.js";
import { graphRequest, isGraphRecord, MetaGraphError } from "../services/metaGraphApi.js";
import {
    generateReply,
    type BusinessInfo,
    type ConversationMessage,
} from "../services/receptionistAI.js";
import { decrypt } from "../utils/crypto.js";

type RawBodyRequest = Request & { rawBody?: Buffer };
type ConnectionRow = RowDataPacket & {
    id: number;
    user_id: number;
    access_token_enc: string;
};
type StoredMessageRow = RowDataPacket & {
    direction: "in" | "out";
    body: string;
};
type BusinessRow = RowDataPacket & {
    business_name: string;
    services: unknown;
    working_hours: unknown;
    custom_instructions: string | null;
};
type SendMessageResponse = {
    messages: { id: string }[];
};

const router = Router();

const isSendMessageResponse = (value: unknown): value is SendMessageResponse =>
    isGraphRecord(value)
    && Array.isArray(value.messages)
    && value.messages.every(
        (message: unknown) => isGraphRecord(message) && typeof message.id === "string",
    );

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const parseSignupVerification = (value: unknown): string | null => {
    if (!isRecord(value)) return null;
    const mode = value["hub.mode"];
    const token = value["hub.verify_token"];
    const challenge = value["hub.challenge"];
    if (
        mode !== "subscribe"
        || typeof token !== "string"
        || token !== process.env.WA_VERIFY_TOKEN
        || typeof challenge !== "string"
    ) {
        return null;
    }
    return challenge;
};

const hasValidSignature = (req: RawBodyRequest): boolean => {
    const secret = process.env.META_APP_SECRET;
    const signature = req.header("x-hub-signature-256");
    if (!secret || !signature?.startsWith("sha256=") || !req.rawBody) return false;

    const expected = createHmac("sha256", secret).update(req.rawBody).digest();
    let received: Buffer;
    try {
        received = Buffer.from(signature.slice("sha256=".length), "hex");
    } catch {
        return false;
    }
    return received.length === expected.length && timingSafeEqual(received, expected);
};

const decodeJsonValue = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return null;
    }
};

const getTimings = (value: unknown): BusinessInfo["timings"] => {
    const decoded = decodeJsonValue(value);
    if (
        !isRecord(decoded)
        || !Array.isArray(decoded.days)
        || !decoded.days.every((day: unknown) => typeof day === "number")
        || typeof decoded.start !== "string"
        || typeof decoded.end !== "string"
    ) {
        return null;
    }
    return { days: decoded.days, start: decoded.start, end: decoded.end };
};

const getServices = (value: unknown): string[] => {
    const decoded = decodeJsonValue(value);
    return Array.isArray(decoded)
        ? decoded.filter((service): service is string => typeof service === "string")
        : [];
};

const buildBusinessInfo = (row: BusinessRow | undefined): BusinessInfo | null => {
    if (!row) return null;
    return {
        businessName: row.business_name,
        timings: getTimings(row.working_hours),
        services: getServices(row.services),
        faqs: [],
        customInstructions: row.custom_instructions,
    };
};

const getIncomingMessages = (payload: unknown): {
    phoneNumberId: string;
    messages: { id: string; from: string; type: string; text?: { body: string } }[];
}[] => {
    if (!isRecord(payload) || !Array.isArray(payload.entry)) return [];
    const results: {
        phoneNumberId: string;
        messages: { id: string; from: string; type: string; text?: { body: string } }[];
    }[] = [];

    for (const entry of payload.entry) {
        if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
        for (const change of entry.changes) {
            if (!isRecord(change) || !isRecord(change.value)) continue;
            const value = change.value;
            if (!isRecord(value.metadata) || typeof value.metadata.phone_number_id !== "string") continue;
            const messages: { id: string; from: string; type: string; text?: { body: string } }[] = [];
            if (Array.isArray(value.messages)) {
                for (const candidate of value.messages) {
                    if (!isRecord(candidate)) continue;
                    if (
                        typeof candidate.id !== "string"
                        || typeof candidate.from !== "string"
                        || typeof candidate.type !== "string"
                    ) {
                        continue;
                    }
                    const text = isRecord(candidate.text) && typeof candidate.text.body === "string"
                        ? { body: candidate.text.body }
                        : undefined;
                    messages.push({
                        id: candidate.id,
                        from: candidate.from,
                        type: candidate.type,
                        ...(text ? { text } : {}),
                    });
                }
            }
            results.push({ phoneNumberId: value.metadata.phone_number_id, messages });
        }
    }
    return results;
};

const getActiveConnection = async (phoneNumberId: string): Promise<ConnectionRow | null> => {
    const [rows] = await pool.execute<ConnectionRow[]>(
        `SELECT id, user_id, access_token_enc
         FROM whatsapp_connections
         WHERE phone_number_id = ? AND status = 'active'
         LIMIT 1`,
        [phoneNumberId],
    );
    return rows[0] ?? null;
};

const getConversationHistory = async (
    connectionId: number,
    customerPhone: string,
): Promise<ConversationMessage[]> => {
    const [rows] = await pool.execute<StoredMessageRow[]>(
        `SELECT direction, body
         FROM wa_messages
         WHERE connection_id = ? AND customer_phone = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 10`,
        [connectionId, customerPhone],
    );
    return rows.reverse().map(({ direction, body }) => ({ direction, body }));
};

const getBusinessInfo = async (userId: number): Promise<BusinessInfo | null> => {
    const [rows] = await pool.execute<BusinessRow[]>(
        `SELECT business_name, services, working_hours, custom_instructions
         FROM Details
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [userId],
    );
    return buildBusinessInfo(rows[0]);
};

const processTextMessage = async (
    phoneNumberId: string,
    message: { id: string; from: string; text: { body: string } },
): Promise<void> => {
    const connection = await getActiveConnection(phoneNumberId);
    if (!connection) return;

    const [insertResult] = await pool.execute<ResultSetHeader>(
        `INSERT IGNORE INTO wa_messages
            (connection_id, wa_message_id, customer_phone, direction, body)
         VALUES (?, ?, ?, 'in', ?)`,
        [connection.id, message.id, message.from, message.text.body],
    );
    if (!insertResult.affectedRows) return;

    const [history, businessInfo] = await Promise.all([
        getConversationHistory(connection.id, message.from),
        getBusinessInfo(connection.user_id),
    ]);
    const reply = await generateReply(connection.user_id, history, message.text.body, businessInfo);
    const accessToken = decrypt(connection.access_token_enc);

    try {
        const response = await graphRequest(
            `${encodeURIComponent(phoneNumberId)}/messages`,
            {
                method: "POST",
                accessToken,
                body: {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: message.from,
                    type: "text",
                    text: { body: reply },
                },
            },
            isSendMessageResponse,
        );
        const messageId = response.messages[0]?.id;
        if (!messageId) {
            throw new Error("Meta did not return the outgoing WhatsApp message ID");
        }

        await pool.execute<ResultSetHeader>(
            `INSERT IGNORE INTO wa_messages
                (connection_id, wa_message_id, customer_phone, direction, body)
             VALUES (?, ?, ?, 'out', ?)`,
            [connection.id, messageId, message.from, reply],
        );
    } catch (error) {
        if (error instanceof MetaGraphError && (error.status === 401 || error.metaCode === 190)) {
            await pool.execute<ResultSetHeader>(
                "UPDATE whatsapp_connections SET status = 'disconnected' WHERE id = ?",
                [connection.id],
            );
        }
        throw error;
    }
};

const processWebhook = async (payload: unknown): Promise<void> => {
    for (const change of getIncomingMessages(payload)) {
        for (const message of change.messages) {
            if (message.type !== "text" || !message.text) {
                // TODO: Handle media and other non-text WhatsApp message types.
                continue;
            }
            try {
                await processTextMessage(change.phoneNumberId, {
                    id: message.id,
                    from: message.from,
                    text: message.text,
                });
            } catch (error) {
                if (error instanceof MetaGraphError) {
                    console.error("WhatsApp auto-reply failed during Meta Graph API request", {
                        status: error.status,
                        code: error.metaCode,
                    });
                } else {
                    console.error("WhatsApp auto-reply processing failed", error);
                }
            }
        }
    }
};

router.get("/", (req: Request, res: Response) => {
    if (!process.env.WA_VERIFY_TOKEN) {
        console.error("WhatsApp webhook verification token is not configured");
        return res.sendStatus(500);
    }
    const challenge = parseSignupVerification(req.query);
    if (challenge === null) return res.sendStatus(403);
    return res.status(200).send(challenge);
});

router.post("/", (req: RawBodyRequest, res: Response) => {
    if (!hasValidSignature(req)) return res.sendStatus(401);

    res.sendStatus(200);
    void processWebhook(req.body).catch((error: unknown) => {
        console.error("WhatsApp webhook processing failed", error);
    });
});

export default router;
