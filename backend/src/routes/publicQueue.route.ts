import { Router } from "express";
import { rateLimiter } from "../helpers/rateLimiting.js";
import { createPublicToken, getPublicQueueInfo } from "../controllers/queue.controller.js";

const router = Router();
const publicLimit = rateLimiter({
    windowMs: 60 * 60_000,
    max: 30,
    prefix: "public-queue",
    failClosed: true,
});

router.get("/:businessId", getPublicQueueInfo);
router.post("/:businessId/tokens", publicLimit, createPublicToken);

export default router;
