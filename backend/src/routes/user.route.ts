import { NextFunction, Request, Response, Router } from "express";
import { rateLimiter } from "../helpers/rateLimiting.js";
import { AuthRequest, authMiddleware } from "../middleware/auth.js";
import {
    finishGoogleOAuth,
    startGoogleOAuth,
    userLogin,
    userLogout,
    userRegister,
    userSession,
} from "../controllers/user.controller.js";

const router = Router();

const ip = (req: any) => req.ip ?? "unknown";
const id = (v: unknown) => String(v ?? "unknown").trim().toLowerCase().slice(0, 100);
const googleOAuthAuth = (req: Request, res: Response, next: NextFunction) => {
    const calendarFlow =
        req.query.flow === "calendar" || req.cookies?.google_oauth_flow === "calendar";
    return calendarFlow ? authMiddleware(req as AuthRequest, res, next) : next();
};

router.get("/google", googleOAuthAuth, startGoogleOAuth);
router.get("/google/callback", googleOAuthAuth, finishGoogleOAuth);

router.post(
    "/login",
    rateLimiter({ windowMs: 15 * 60_000, max: 30, prefix: "login-ip", keyGenerator: ip }),
    rateLimiter({
        windowMs: 15 * 60_000,
        max: 5,
        prefix: "login-id",
        keyGenerator: (req) => `${ip(req)}:${id(req.body?.identity)}`,
    }),
    userLogin
);

router.post(
    "/signup",
    rateLimiter({ windowMs: 60 * 60_000, max: 10, prefix: "register-ip", keyGenerator: ip }),
    userRegister
);

router.get("/session", authMiddleware, userSession);
router.post("/logout", userLogout);

export default router;