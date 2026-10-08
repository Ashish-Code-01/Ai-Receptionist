import { Request, Response } from "express";
import bcrypt from "bcrypt";
import pool from "../config/db.js";
import {
    readSessionToken,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_OPTIONS,
    signToken,
    verifyToken,
} from "../helpers/token.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";

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

        const isMatch = await bcrypt.compare(pass, user.password);

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

export const userSession = (req: Request, res: Response) => {
    const token = readSessionToken(req.headers.cookie);
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
