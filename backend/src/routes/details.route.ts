import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimiter } from "../helpers/rateLimiting.js";
import {
    createBusiness,
    connectWhatsapp,
    deleteBusiness,
    getBusiness,
    updateBusiness,
} from "../controllers/details.controller.js";

const router = Router();
router.use(authMiddleware);

const userKey = (req: any) => String(req.user?.id ?? req.ip ?? "unknown");

const readLimit = rateLimiter({ windowMs: 60_000, max: 60, prefix: "biz-read", keyGenerator: userKey });
const writeLimit = rateLimiter({ windowMs: 60_000, max: 10, prefix: "biz-write", keyGenerator: userKey });
const createLimit = rateLimiter({ windowMs: 60 * 60_000, max: 5, prefix: "biz-create", keyGenerator: userKey });

router.get("/:id", readLimit, getBusiness);
router.post("/", createLimit, writeLimit, createBusiness);
router.post("/:id/whatsapp", writeLimit, connectWhatsapp);
router.patch("/:id", writeLimit, updateBusiness);
router.delete("/:id", writeLimit, deleteBusiness);

export default router;