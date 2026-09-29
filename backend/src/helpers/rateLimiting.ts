// rateLimiter.ts
import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis.js";

const LUA = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { count, ttl }
`;

interface Options {
    windowMs: number;
    max: number;
    prefix: string;
    keyGenerator?: (req: Request) => string;
}

export const rateLimiter = ({ windowMs, max, prefix, keyGenerator }: Options) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const id = keyGenerator ? keyGenerator(req) : req.ip;
        const key = `rl:${prefix}:${id}`;

        try {
            const [count, ttl] = (await redis.eval(LUA, 1, key, windowMs)) as [number, number];

            res.setHeader("X-RateLimit-Limit", max);
            res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));

            if (count > max) {
                res.setHeader("Retry-After", Math.ceil(ttl / 1000));
                return res.status(429).send({ message: "Too many requests, try again later" });
            }

            next();
        } catch (err) {
            // Redis down ho to app band mat karo (fail-open)
            console.error("Rate limiter error:", err);
            next();
        }
    };