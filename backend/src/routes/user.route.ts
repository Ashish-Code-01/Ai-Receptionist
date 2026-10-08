import { Router } from "express";
import { rateLimiter } from "../helpers/rateLimiting.js";
import { userLogin, userLogout, userRegister, userSession } from "../controllers/user.controller.js";


const route = Router()

route.post('/login', rateLimiter({ windowMs: 15 * 60_000, max: 30, prefix: "login", keyGenerator: (req) => `${req.ip}:${req.body?.identity ?? "unknown"}`, }), userLogin)
route.get('/session', userSession)
route.post('/logout', userLogout)
route.post('/signup', rateLimiter({ windowMs: 15 * 60_000, max: 20, prefix: "register", keyGenerator: (req) => `${req.ip}:${req.body?.identity ?? "unknown"}`, }), userRegister)

export default route