import { randomBytes, timingSafeEqual } from "node:crypto";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { google } from "googleapis";
import pool from "../config/db.js";
import {
    readSessionToken,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_OPTIONS,
    signToken,
    verifyToken,
} from "../helpers/token.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { AuthRequest } from "../middleware/auth.js";

const GOOGLE_STATE_COOKIE = "google_oauth_state";
const GOOGLE_FLOW_COOKIE = "google_oauth_flow";
const GOOGLE_BUSINESS_COOKIE = "google_oauth_business";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_OAUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/user/google",
    maxAge: 10 * 60 * 1000,
};

type GoogleFlow = "signup" | "login" | "calendar";
interface GoogleUserRow extends RowDataPacket {
    id: number;
    google_sub: string | null;
}

interface GoogleBusinessRow extends RowDataPacket {
    google_refresh_token: string | null;
}

const getFrontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

const clearGoogleOAuthCookies = (res: Response) => {
    res.clearCookie(GOOGLE_STATE_COOKIE, GOOGLE_OAUTH_COOKIE_OPTIONS);
    res.clearCookie(GOOGLE_FLOW_COOKIE, GOOGLE_OAUTH_COOKIE_OPTIONS);
    res.clearCookie(GOOGLE_BUSINESS_COOKIE, GOOGLE_OAUTH_COOKIE_OPTIONS);
};

const redirectToGoogleError = (
    req: Request,
    res: Response,
    flow: GoogleFlow,
    error: string,
    requestedBusinessId?: number,
) => {
    const businessId = requestedBusinessId ?? req.cookies?.[GOOGLE_BUSINESS_COOKIE];
    clearGoogleOAuthCookies(res);
    if (flow === "calendar") {
        const validBusinessId = typeof businessId === "number"
            ? businessId
            : typeof businessId === "string" && /^\d+$/.test(businessId)
                ? Number(businessId)
            : null;
        const destination = validBusinessId && Number.isSafeInteger(validBusinessId) && validBusinessId > 0
            ? `/details?businessId=${validBusinessId}&calendar=error`
            : "/dashboard?calendar=error";
        return res.redirect(`${getFrontendUrl()}${destination}`);
    }
    return res.redirect(`${getFrontendUrl()}/${flow === "login" ? "login" : "signup"}?google=${error}`);
};

const createGoogleOAuthClient = () => {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) return null;

    return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
};

export const startGoogleOAuth = async (req: AuthRequest, res: Response) => {
    const flow: GoogleFlow = req.query.flow === "calendar"
        ? "calendar"
        : req.query.flow === "login" ? "login" : "signup";

    let businessId: number | null = null;
    if (flow === "calendar") {
        const requestedId = typeof req.query.businessId === "string" ? req.query.businessId : "";
        businessId = /^\d+$/.test(requestedId) ? Number(requestedId) : null;
        if (businessId === null || !Number.isSafeInteger(businessId) || businessId <= 0 || !req.user) {
            return res.redirect(`${getFrontendUrl()}/dashboard?calendar=error`);
        }
        res.cookie(GOOGLE_BUSINESS_COOKIE, String(businessId), GOOGLE_OAUTH_COOKIE_OPTIONS);
    }

    const client = createGoogleOAuthClient();
    if (!client) return redirectToGoogleError(req, res, flow, "not_configured", businessId ?? undefined);

    if (flow === "calendar") {
        try {
            const userId = req.user?.id;
            if (!userId) return redirectToGoogleError(req, res, flow, "failed");
            const [rows] = await pool.execute<GoogleBusinessRow[]>(
                "SELECT google_refresh_token FROM Details WHERE id = ? AND user_id = ? LIMIT 1",
                [businessId, userId],
            );
            if (!rows[0]) {
                return redirectToGoogleError(req, res, flow, "business_not_found", businessId ?? undefined);
            }
        } catch (error) {
            console.error("Google Calendar connection could not verify the business", error);
            return redirectToGoogleError(req, res, flow, "failed", businessId ?? undefined);
        }
    }

    const state = randomBytes(32).toString("hex");
    res.cookie(GOOGLE_STATE_COOKIE, state, GOOGLE_OAUTH_COOKIE_OPTIONS);
    res.cookie(GOOGLE_FLOW_COOKIE, flow, GOOGLE_OAUTH_COOKIE_OPTIONS);

    return res.redirect(client.generateAuthUrl({
        access_type: flow === "calendar" ? "offline" : "online",
        prompt: flow === "calendar" ? "consent select_account" : "select_account",
        scope: flow === "calendar"
            ? [GOOGLE_CALENDAR_SCOPE]
            : ["openid", "email", "profile"],
        state,
    }));
};

export const finishGoogleOAuth = async (req: AuthRequest, res: Response) => {
    const cookieFlow = req.cookies?.[GOOGLE_FLOW_COOKIE];
    const flow: GoogleFlow = cookieFlow === "calendar" || cookieFlow === "login" ? cookieFlow : "signup";
    const queryState = typeof req.query.state === "string" ? req.query.state : "";
    const cookieState = req.cookies?.[GOOGLE_STATE_COOKIE];
    const stateMatches =
        typeof cookieState === "string" &&
        queryState.length === cookieState.length &&
        timingSafeEqual(Buffer.from(queryState), Buffer.from(cookieState));

    if (!stateMatches) return redirectToGoogleError(req, res, flow, "invalid_state");
    if (req.query.error) return redirectToGoogleError(req, res, flow, "cancelled");

    const code = typeof req.query.code === "string" ? req.query.code : "";
    const client = createGoogleOAuthClient();
    if (!client) return redirectToGoogleError(req, res, flow, "not_configured");
    if (!code) return redirectToGoogleError(req, res, flow, "failed");

    try {
        const { tokens } = await client.getToken(code);
        if (flow === "calendar") {
            const businessCookie = req.cookies?.[GOOGLE_BUSINESS_COOKIE];
            const businessId = typeof businessCookie === "string" && /^\d+$/.test(businessCookie)
                ? Number(businessCookie)
                : null;
            const userId = req.user?.id;
            if (
                businessId === null ||
                !Number.isSafeInteger(businessId) ||
                businessId <= 0 ||
                !userId ||
                !tokens.access_token
            ) {
                return redirectToGoogleError(req, res, flow, "failed");
            }

            const [businessRows] = await pool.execute<GoogleBusinessRow[]>(
                "SELECT google_refresh_token FROM Details WHERE id = ? AND user_id = ? LIMIT 1",
                [businessId, userId],
            );
            const existingRefreshToken = businessRows[0]?.google_refresh_token;
            if (!businessRows[0] || (!tokens.refresh_token && !existingRefreshToken)) {
                return redirectToGoogleError(req, res, flow, "failed");
            }

            await pool.execute(
                `UPDATE Details
                 SET calendar_id = 'primary',
                     google_refresh_token = COALESCE(?, google_refresh_token)
                 WHERE id = ? AND user_id = ?`,
                [tokens.refresh_token ?? null, businessId, userId],
            );
            clearGoogleOAuthCookies(res);
            return res.redirect(`${getFrontendUrl()}/details?businessId=${businessId}`);
        }

        if (!tokens.id_token || !process.env.GOOGLE_CLIENT_ID) {
            return redirectToGoogleError(req, res, flow, "failed");
        }

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const profile = ticket.getPayload();
        const googleId = profile?.sub;
        const email = profile?.email?.trim().toLowerCase();
        const fullName = profile?.name?.trim() || email?.split("@")[0];

        if (!googleId || !email || profile?.email_verified !== true || !fullName) {
            return redirectToGoogleError(req, res, flow, "unverified_email");
        }

        const [googleMatches] = await pool.execute<GoogleUserRow[]>(
            "SELECT id, google_sub FROM Users WHERE google_sub = ? LIMIT 1",
            [googleId],
        );
        let userId: number;
        let isNewUser = false;

        if (googleMatches[0]) {
            userId = googleMatches[0].id;
            await pool.execute(
                "UPDATE Users SET email = ?, full_name = ? WHERE id = ?",
                [email, fullName, userId],
            );
        } else {
            const [emailMatches] = await pool.execute<GoogleUserRow[]>(
                "SELECT id, google_sub FROM Users WHERE email = ? LIMIT 1",
                [email],
            );
            const emailMatch = emailMatches[0];

            if (emailMatch?.google_sub && emailMatch.google_sub !== googleId) {
                return redirectToGoogleError(req, res, flow, "account_conflict");
            }

            if (emailMatch) {
                userId = emailMatch.id;
                await pool.execute(
                    "UPDATE Users SET google_sub = ?, full_name = ? WHERE id = ?",
                    [googleId, fullName, userId],
                );
            } else {
                const [result] = await pool.execute<ResultSetHeader>(
                    `INSERT INTO Users (full_name, email, phone, password, google_sub)
                     VALUES (?, ?, NULL, NULL, ?)`,
                    [fullName, email, googleId],
                );
                userId = result.insertId;
                isNewUser = true;
            }
        }

        clearGoogleOAuthCookies(res);
        res.cookie(SESSION_COOKIE_NAME, signToken(userId, email), SESSION_COOKIE_OPTIONS);
        return res.redirect(`${getFrontendUrl()}${isNewUser ? "/details" : "/dashboard"}`);
    } catch (error) {
        console.error("Google OAuth sign-in failed", error);
        return redirectToGoogleError(req, res, flow, "failed");
    }
};

export const userLogin = async (req: Request, res: Response) => {
    try {
        const { identity, pass } = req.body;

        if (!identity || !pass) {
            return res.status(400).send({ message: "Email or phone, and password are required" });
        }

        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM Users WHERE email = ? OR phone = ? LIMIT 1`,
            [identity, identity]
        );

        const user = rows[0];

        if (!user) {
            return res.status(401).send({ message: "Invalid credentials" });
        }

        const isMatch =
            typeof user.password === "string" &&
            await bcrypt.compare(pass, user.password);

        if (!isMatch) {
            return res.status(401).send({ message: "Invalid credentials" });
        }

        const token = signToken(user.id, user.email);
        res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

        const { password, ...safeUser } = user;

        return res.status(200).send({
            message: "User login successful",
            user: safeUser,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: "Something went wrong" });
    }
};

export const userSession = (_req: Request, res: Response) => {
    const token = readSessionToken(_req.headers.cookie);
    if (!token) {
        return res.status(401).send({ message: "Authentication required" });
    }

    try {
        verifyToken(token);
        return res.status(200).send({ authenticated: true });
    } catch {
        return res.status(401).send({ message: "Authentication required" });
    }
};

export const userLogout = (_req: Request, res: Response) => {
    res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
        secure: SESSION_COOKIE_OPTIONS.secure,
        sameSite: SESSION_COOKIE_OPTIONS.sameSite,
        path: SESSION_COOKIE_OPTIONS.path,
    });
    return res.status(204).end();
};

export const userRegister = async (req: Request, res: Response) => {
    try {
        const { full_name, email, phone, pass } = req.body;

        if (!full_name || !email || !phone || !pass) {
            return res.status(400).send({ message: "All fields are required" });
        }

        const [existingEmail] = await pool.query<RowDataPacket[]>(
            `SELECT id FROM Users WHERE email = ?`,
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(409).send({ message: "Email already registered" });
        }

        const [existingPhone] = await pool.query<RowDataPacket[]>(
            `SELECT id FROM Users WHERE phone = ?`,
            [phone]
        );

        if (existingPhone.length > 0) {
            return res.status(409).send({ message: "Phone number already registered" });
        }

        const hashedPass = await bcrypt.hash(pass, 10);

        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO Users (full_name, email, phone, password)
            VALUES (?, ?, ?, ?)`,
            [full_name, email, phone, hashedPass]
        );

        const user = {
            id: result.insertId,
            full_name,
            email,
        };

        return res.status(201).send({
            message: "User registered successfully",
            user,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Something is wrong" });
    }
};
