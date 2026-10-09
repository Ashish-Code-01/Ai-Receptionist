import { Router } from "express";
import { rateLimiter } from "../helpers/rateLimiting.js";
import { authMiddleware } from "../middleware/auth.js";
import { userLogin, userLogout, userRegister, userSession } from "../controllers/user.controller.js";

const router = Router();

const ip = (req: any) => req.ip ?? "unknown";
const id = (v: unknown) => String(v ?? "unknown").trim().toLowerCase().slice(0, 100);

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