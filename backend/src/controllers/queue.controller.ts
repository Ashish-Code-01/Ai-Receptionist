import type { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import pool from "../config/db.js";
import type { AuthRequest } from "../middleware/auth.js";

interface ClinicRow extends RowDataPacket {
    id: number;
    business_name: string;
    timezone: string;
}

interface QueueRow extends RowDataPacket {
    id: number;
    token_number: number;
    token_date: string;
    patient_name: string;
    patient_phone: string;
    status: "waiting" | "ongoing" | "done" | "cancelled";
    payment_status: "pending" | "paid" | "waived";
    payment_amount: string | null;
    payment_method: string | null;
    created_at: Date;
    paid_at: Date | null;
}

const patientInput = z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/),
    website: z.string().max(0).optional(),
});

const paymentInput = z.object({
    status: z.enum(["pending", "paid", "waived"]),
    amount: z.number().finite().min(0).max(1_000_000).optional(),
    method: z.enum(["cash", "card", "upi", "other"]).nullable().optional(),
}).superRefine((value, context) => {
    if (value.status === "paid" && (!value.amount || value.amount <= 0)) {
        context.addIssue({ code: "custom", message: "Enter an amount greater than zero for a paid visit", path: ["amount"] });
    }
});

const statusInput = z.object({ status: z.enum(["waiting", "ongoing", "done", "cancelled"]) });

const validId = (value: string): number | null => {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const clinicToday = (timezone: string, date = new Date()): string => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
};

const findClinic = async (businessId: number): Promise<ClinicRow | undefined> => {
    const [rows] = await pool.execute<ClinicRow[]>(
        "SELECT id, business_name, timezone FROM Details WHERE id = ? AND active = TRUE LIMIT 1",
        [businessId],
    );
    return rows[0];
};

const ownedClinic = async (req: AuthRequest, businessId: number): Promise<ClinicRow | undefined> => {
    const [rows] = await pool.execute<ClinicRow[]>(
        "SELECT id, business_name, timezone FROM Details WHERE id = ? AND user_id = ? LIMIT 1",
        [businessId, req.user!.id],
    );
    return rows[0];
};

export const getPublicQueueInfo = async (req: Request, res: Response) => {
    const businessId = validId(String(req.params.businessId));
    if (!businessId) return res.status(400).json({ success: false, message: "Invalid clinic" });
    try {
        const clinic = await findClinic(businessId);
        if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });
        const day = clinicToday(clinic.timezone);
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT COUNT(*) AS waiting_count, COALESCE(MAX(token_number), 0) AS last_token
             FROM queue_visits WHERE business_id = ? AND token_date = ? AND status = 'waiting'`,
            [businessId, day],
        );
        return res.json({
            success: true,
            data: { businessName: clinic.business_name, date: day, waitingCount: Number(rows[0].waiting_count), lastToken: Number(rows[0].last_token) },
        });
    } catch (error) {
        console.error("Could not load public queue", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({ success: false, message: "Could not load clinic queue" });
    }
};

export const createPublicToken = async (req: Request, res: Response) => {
    const businessId = validId(String(req.params.businessId));
    const parsed = patientInput.safeParse(req.body);
    if (!businessId) return res.status(400).json({ success: false, message: "Invalid clinic" });
    if (!parsed.success) return res.status(400).json({ success: false, message: "Enter a valid name and phone number" });
    try {
        const clinic = await findClinic(businessId);
        if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });
        const tokenDate = clinicToday(clinic.timezone);
        const connection = await pool.getConnection();
        let tokenNumber: number;
        try {
            await connection.beginTransaction();
            await connection.execute(
                `INSERT IGNORE INTO queue_counters (business_id, token_date, last_token)
                 VALUES (?, ?, 0)`,
                [businessId, tokenDate],
            );
            const [counterRows] = await connection.execute<RowDataPacket[]>(
                `SELECT last_token FROM queue_counters
                 WHERE business_id = ? AND token_date = ? FOR UPDATE`,
                [businessId, tokenDate],
            );
            tokenNumber = Number(counterRows[0].last_token) + 1;
            await connection.execute(
                `UPDATE queue_counters SET last_token = ?
                 WHERE business_id = ? AND token_date = ?`,
                [tokenNumber, businessId, tokenDate],
            );
            await connection.execute(
                `INSERT INTO queue_visits
                 (business_id, token_date, token_number, patient_name, patient_phone)
                 VALUES (?, ?, ?, ?, ?)`,
                [businessId, tokenDate, tokenNumber, parsed.data.name, parsed.data.phone],
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        return res.status(201).json({
            success: true,
            data: { businessName: clinic.business_name, date: tokenDate, tokenNumber },
        });
    } catch (error) {
        console.error("Could not create queue token", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({ success: false, message: "Could not issue a token. Please try again." });
    }
};

export const getQueue = async (req: AuthRequest, res: Response) => {
    const businessId = validId(String(req.params.id));
    if (!businessId) return res.status(400).json({ success: false, message: "Invalid clinic" });
    try {
        const clinic = await ownedClinic(req, businessId);
        if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });
        const day = clinicToday(clinic.timezone);
        const [rows] = await pool.execute<QueueRow[]>(
            `SELECT id, token_number, token_date, patient_name, patient_phone, status,
                    payment_status, payment_amount, payment_method, created_at, paid_at
             FROM queue_visits WHERE business_id = ? AND token_date = ?
             ORDER BY FIELD(status, 'ongoing', 'waiting', 'done', 'cancelled'), token_number`,
            [businessId, day],
        );
        return res.json({ success: true, data: { clinic: clinic.business_name, date: day, timezone: clinic.timezone, tokens: rows } });
    } catch (error) {
        console.error("Could not load clinic queue", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({ success: false, message: "Could not load queue" });
    }
};

export const updateQueueStatus = async (req: AuthRequest, res: Response) => {
    const businessId = validId(String(req.params.id));
    const tokenId = validId(String(req.params.tokenId));
    const parsed = statusInput.safeParse(req.body);
    if (!businessId || !tokenId) return res.status(400).json({ success: false, message: "Invalid queue entry" });
    if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid queue status" });
    try {
        const clinic = await ownedClinic(req, businessId);
        if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });
        const [rows] = await pool.execute<QueueRow[]>(
            `SELECT id, status FROM queue_visits WHERE id = ? AND business_id = ? LIMIT 1`,
            [tokenId, businessId],
        );
        if (!rows[0]) return res.status(404).json({ success: false, message: "Token not found" });
        const allowed: Record<QueueRow["status"], QueueRow["status"][]> = {
            waiting: ["ongoing", "cancelled"],
            ongoing: ["done", "cancelled"],
            done: [],
            cancelled: [],
        };
        const current = rows[0].status;
        if (!allowed[current].includes(parsed.data.status)) {
            return res.status(409).json({ success: false, message: "That queue transition is not allowed" });
        }
        const [result] = await pool.execute<ResultSetHeader>(
            "UPDATE queue_visits SET status = ? WHERE id = ? AND business_id = ? AND status = ?",
            [parsed.data.status, tokenId, businessId, current],
        );
        if (!result.affectedRows) return res.status(409).json({ success: false, message: "Queue entry changed; refresh and try again" });
        return res.json({ success: true });
    } catch (error) {
        console.error("Could not update queue status", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({ success: false, message: "Could not update queue status" });
    }
};

export const updateQueuePayment = async (req: AuthRequest, res: Response) => {
    const businessId = validId(String(req.params.id));
    const tokenId = validId(String(req.params.tokenId));
    const parsed = paymentInput.safeParse(req.body);
    if (!businessId || !tokenId) return res.status(400).json({ success: false, message: "Invalid queue entry" });
    if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid payment" });
    try {
        const clinic = await ownedClinic(req, businessId);
        if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });
        const paymentValues: (string | number | Date | null)[] = [
            parsed.data.status,
            parsed.data.status === "paid" ? parsed.data.amount ?? null : null,
            parsed.data.status === "paid" ? parsed.data.method ?? "other" : null,
            parsed.data.status === "paid" ? new Date() : null,
            parsed.data.status === "paid" ? clinicToday(clinic.timezone) : null,
            tokenId,
            businessId,
        ];
        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE queue_visits
             SET payment_status = ?,
                 payment_amount = ?,
                 payment_method = ?,
                 paid_at = ?,
                 paid_date = ?
             WHERE id = ? AND business_id = ? AND status <> 'cancelled'`,
            paymentValues,
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Active token not found" });
        return res.json({ success: true });
    } catch (error) {
        console.error("Could not update queue payment", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({ success: false, message: "Could not update payment" });
    }
};

export const getRevenue = async (req: AuthRequest, res: Response) => {
    const businessId = validId(String(req.params.id));
    if (!businessId) return res.status(400).json({ success: false, message: "Invalid clinic" });
    try {
        const clinic = await ownedClinic(req, businessId);
        if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });
        const today = clinicToday(clinic.timezone);
        const from = typeof req.query.from === "string" ? req.query.from : today;
        const to = typeof req.query.to === "string" ? req.query.to : from;
        const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
            && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
            && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
        if (!validDate(from) || !validDate(to)) return res.status(400).json({ success: false, message: "Invalid date range" });
        if (to < from) return res.status(400).json({ success: false, message: "End date must not be before start date" });
        const rangeDays = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
        if (rangeDays > 366) return res.status(400).json({ success: false, message: "Choose a date range of one year or less" });
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT DATE_FORMAT(paid_date, '%Y-%m-%d') AS date,
                    COUNT(*) AS payments, SUM(payment_amount) AS amount
             FROM queue_visits
             WHERE business_id = ? AND payment_status = 'paid' AND paid_date BETWEEN ? AND ?
             GROUP BY paid_date ORDER BY paid_date DESC`,
            [businessId, from, to],
        );
        const [totalRows] = await pool.execute<RowDataPacket[]>(
            `SELECT COALESCE(SUM(payment_amount), 0) AS total, COUNT(*) AS payments
             FROM queue_visits
             WHERE business_id = ? AND payment_status = 'paid' AND paid_date = ?`,
            [businessId, clinicToday(clinic.timezone)],
        );
        return res.json({
            success: true,
            data: {
                currency: "INR",
                today: { amount: Number(totalRows[0].total), payments: Number(totalRows[0].payments) },
                from,
                to,
                days: rows.map((row) => ({ date: row.date, payments: Number(row.payments), amount: Number(row.amount) })),
            },
        });
    } catch (error) {
        console.error("Could not load revenue", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({ success: false, message: "Could not load revenue" });
    }
};
