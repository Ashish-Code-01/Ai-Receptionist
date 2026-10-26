import "dotenv/config";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const redisPassword = process.env.REDIS_PASSWORD ?? (process.env.REDIS_URL ? undefined : "redispass");

export const redis = redisPassword
    ? new Redis(redisUrl, { password: redisPassword })
    : new Redis(redisUrl);

redis.on("error", (err: Error) => console.error("Redis error:", err.message));
