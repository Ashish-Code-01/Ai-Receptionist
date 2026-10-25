import { randomInt } from "node:crypto";
import { Router } from "express";
import type { Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import pool from "../config/db.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { encrypt } from "../utils/crypto.js";
import { graphRequest, isGraphRecord, MetaGraphError } from "../services/metaGraphApi.js";

const router = Router();
router.use(authMiddleware);

const connectSchema = z.object({
    code: z.string().trim().min(1).max(4096),
    waba_id: z.string().trim().regex(/^\d{1,64}$/),
    phone_number_id: z.string().trim().regex(/^\d{1,64}$/),
});

type AccessTokenResponse = {
    access_token: string;
};

type DisplayPhoneResponse = {
    display_phone_number: string;
};

const isAccessTokenResponse = (value: unknown): value is AccessTokenResponse =>
    isGraphRecord(value) && typeof value.access_token === "string" && value.access_token.length > 0;

const isDisplayPhoneResponse = (value: unknown): value is DisplayPhoneResponse =>
    isGraphRecord(value) && typeof value.display_phone_number === "string";

const isGraphObject = (value: unknown): value is Record<string, unknown> =>
    isGraphRecord(value);

const graphFailure = (error: unknown): { status: number; message: string } => {
    if (error instanceof MetaGraphError) {
        return {
            status: error.status === 400 ? 400 : 502,
            message: error.message,
        };
    }
    return { status: 500, message: "WhatsApp connection could not be completed" };
};

router.post("/connect", async (req: AuthRequest, res: Response) => {
    const parsed = connectSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ ok: false, message: "Invalid WhatsApp signup details" });
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
        console.error("WhatsApp connect is missing Meta app configuration");
        return res.status(500).json({ ok: false, message: "WhatsApp connection is not configured" });
    }

    try {
        const { code, waba_id: wabaId, phone_number_id: phoneNumberId } = parsed.data;
        const tokenResponse = await graphRequest(
            "oauth/access_token",
            {
                query: { client_id: appId, client_secret: appSecret, code },
            },
            isAccessTokenResponse,
        );
        const accessToken = tokenResponse.access_token;

        await graphRequest(
            `${encodeURIComponent(wabaId)}/subscribed_apps`,
            { method: "POST", accessToken },
            isGraphObject,
        );
        await graphRequest(
            `${encodeURIComponent(phoneNumberId)}/register`,
            {
                method: "POST",
                accessToken,
                body: {
                    messaging_product: "whatsapp",
                    pin: String(randomInt(0, 1_000_000)).padStart(6, "0"),
                },
            },
            isGraphObject,
        );

        const phoneResponse = await graphRequest(
            encodeURIComponent(phoneNumberId),
            { accessToken, query: { fields: "display_phone_number" } },
            isDisplayPhoneResponse,
        );
        const encryptedToken = encrypt(accessToken);

        await pool.execute<ResultSetHeader>(
            `INSERT INTO whatsapp_connections
                (user_id, waba_id, phone_number_id, display_phone, access_token_enc)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                waba_id = IF(user_id = VALUES(user_id), VALUES(waba_id), waba_id),
                display_phone = IF(user_id = VALUES(user_id), VALUES(display_phone), display_phone),
                access_token_enc = IF(user_id = VALUES(user_id), VALUES(access_token_enc), access_token_enc),
                status = IF(user_id = VALUES(user_id), 'active', status)`,
            [req.user!.id, wabaId, phoneNumberId, phoneResponse.display_phone_number, encryptedToken],
        );

        const [connectionRows] = await pool.execute<RowDataPacket[]>(
            "SELECT user_id FROM whatsapp_connections WHERE phone_number_id = ?",
            [phoneNumberId],
        );
        if (!connectionRows.length || Number(connectionRows[0].user_id) !== req.user!.id) {
            return res.status(409).json({
                ok: false,
                message: "This WhatsApp number is already connected to another account",
            });
        }

        return res.json({ ok: true, phone: phoneResponse.display_phone_number });
    } catch (error) {
        if (error instanceof MetaGraphError) {
            const failure = graphFailure(error);
            console.error("WhatsApp connect failed during Meta Graph API request", {
                status: error.status,
                code: error.metaCode,
            });
            return res.status(failure.status).json({ ok: false, message: failure.message });
        }
        console.error("WhatsApp connect failed", {
            errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(500).json({ ok: false, message: graphFailure(error).message });
    }
});

router.get("/status", async (req: AuthRequest, res: Response) => {
    try {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT display_phone, status
             FROM whatsapp_connections
             WHERE user_id = ?
             ORDER BY created_at DESC, id DESC
             LIMIT 1`,
            [req.user!.id],
        );
        if (!rows.length) return res.json(null);
        return res.json({
            display_phone: String(rows[0].display_phone),
            status: String(rows[0].status),
        });
    } catch (error) {
        console.error("Could not load WhatsApp connection status", error);
        return res.status(500).json({ message: "Could not load WhatsApp connection status" });
    }
});

router.post("/disconnect", async (req: AuthRequest, res: Response) => {
    try {
        await pool.execute<ResultSetHeader>(
            "UPDATE whatsapp_connections SET status = 'disconnected' WHERE user_id = ?",
            [req.user!.id],
        );
        return res.json({ ok: true });
    } catch (error) {
        console.error("Could not disconnect WhatsApp", error);
        return res.status(500).json({ ok: false, message: "Could not disconnect WhatsApp" });
    }
});

export default router;
