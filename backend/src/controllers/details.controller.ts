import { Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../config/db.js";
import { AuthRequest } from "../middleware/auth.js";
import {
    businessSchema,
    businessUpdateSchema,
    whatsappCredentialsSchema,
} from "../validators/details.js";


const getUtcOffset = (timeZone: string): string => {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
        .formatToParts(new Date())
        .find(p => p.type === "timeZoneName")?.value ?? "GMT";
    return part === "GMT" ? "+00:00" : part.replace("GMT", "");
};

const toResponse = (r: any) => ({
    id: r.id,
    active: !!r.active,
    businessName: r.business_name,
    exotelNumbers: r.exotel_numbers ?? [],
    calendarId: r.calendar_id,
    calendarConnected: !!r.google_refresh_token,
    whatsappConnected: !!r.whatsapp_token,
    whatsappPhoneNumberId: r.whatsapp_phone_number_id,
    timezone: r.timezone,
    utcOffset: getUtcOffset(r.timezone),
    slotDurationMinutes: r.slot_duration_minutes,
    voice: r.voice,
    services: r.services,
    workingHours: r.working_hours,
    customInstructions: r.custom_instructions,
    maxConcurrentCalls: r.max_concurrent_calls,
});

const isValidTimezone = (tz: string) => {
    try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true; }
    catch { return false; }
};

export const deleteBusiness = async (req: AuthRequest, res: Response) => {
    try {
        const [result] = await pool.execute<ResultSetHeader>(
            "DELETE FROM Details WHERE id = ? AND user_id = ?",
            [Number(req.params.id), req.user!.id]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Not found" });
        return res.json({ success: true, message: "Deleted" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

export const updateBusiness = async (req: AuthRequest, res: Response) => {
    const parsed = businessUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    }
    const d = parsed.data;
    if (d.timezone && !isValidTimezone(d.timezone)) {
        return res.status(400).json({ success: false, message: "Invalid timezone" });
    }

    const map: Record<string, [string, any]> = {
        businessName: ["business_name", d.businessName],
        services: ["services", d.services && JSON.stringify(d.services)],
        workingHours: ["working_hours", d.workingHours && JSON.stringify(d.workingHours)],
        slotDurationMinutes: ["slot_duration_minutes", d.slotDurationMinutes],
        timezone: ["timezone", d.timezone],
        voice: ["voice", d.voice],
        customInstructions: ["custom_instructions", d.customInstructions],
    };

    const sets: string[] = [];
    const values: any[] = [];
    for (const key of Object.keys(map)) {
        if ((d as any)[key] !== undefined) {
            sets.push(`${map[key][0]} = ?`);
            values.push(map[key][1]);
        }
    }
    if (!sets.length) {
        return res.status(400).json({ success: false, message: "Nothing to update" });
    }

    try {
        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE Details SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
            [...values, Number(req.params.id), req.user!.id]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Not found" });
        return res.json({ success: true, message: "Updated" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

export const getBusiness = async (req: AuthRequest, res: Response) => {
    try {
        const [rows] = await pool.execute<RowDataPacket[]>(
            "SELECT * FROM Details WHERE id = ? AND user_id = ?",
            [Number(req.params.id), req.user!.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
        return res.json({ success: true, data: toResponse(rows[0]) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

export const connectWhatsapp = async (req: AuthRequest, res: Response) => {
    const parsed = whatsappCredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            errors: parsed.error.flatten().fieldErrors,
        });
    }

    const businessId = Number(req.params.id);
    if (!Number.isSafeInteger(businessId) || businessId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid business ID" });
    }

    try {
        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE Details
             SET whatsapp_phone_number_id = ?, whatsapp_token = ?
             WHERE id = ? AND user_id = ?`,
            [
                parsed.data.whatsappPhoneNumberId,
                parsed.data.whatsappToken,
                businessId,
                req.user!.id,
            ],
        );

        if (!result.affectedRows) {
            const [rows] = await pool.execute<RowDataPacket[]>(
                "SELECT id FROM Details WHERE id = ? AND user_id = ?",
                [businessId, req.user!.id],
            );
            if (!rows.length) {
                return res.status(404).json({ success: false, message: "Not found" });
            }
        }

        return res.json({ success: true, message: "WhatsApp connected" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const createBusiness = async (req: AuthRequest, res: Response) => {
    const parsed = businessSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    }
    const d = parsed.data;
    if (!isValidTimezone(d.timezone)) {
        return res.status(400).json({ success: false, message: "Invalid timezone" });
    }

    try {
        const [result] = await pool.execute<ResultSetHeader>(
            `INSERT INTO Details
             (user_id, business_name, services, working_hours, slot_duration_minutes,
              timezone, voice, custom_instructions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user!.id,
                d.businessName,
                JSON.stringify(d.services),
                JSON.stringify(d.workingHours),
                d.slotDurationMinutes,
                d.timezone,
                d.voice,
                d.customInstructions ?? null,
            ]
        );
        return res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}