import { Router } from "express";
import { rateLimiter } from "../helpers/rateLimiting.js";
import { userLogin, userRegister } from "../controllers/user.controller.js";


const route = Router()

route.get('/', rateLimiter({ windowMs: 15 * 60_000, max: 3, prefix: "login", keyGenerator: (req) => `${req.ip}:${req.body?.identity ?? "unknown"}`, }), userLogin)
route.post('/', rateLimiter({ windowMs: 15 * 60_000, max: 2, prefix: "register", keyGenerator: (req) => `${req.ip}:${req.body?.identity ?? "unknown"}`, }), userRegister)

export default route