import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../helpers/token.js";

export interface AuthRequest extends Request {
    user?: { id: number; email: string };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ")
        ? header.slice(7)
        : req.cookies?.token;

    if (!token) {
        return res.status(401).json({ success: false, message: "Token missing" });
    }

    try {
        const decoded = verifyToken(token) as { id: number; email: string };
        req.user = { id: decoded.id, email: decoded.email };
        next();
    } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};