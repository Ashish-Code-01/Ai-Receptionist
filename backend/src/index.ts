import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import UserRoute from "./routes/user.route.js"

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const allowedOrigins = (process.env.CORS_ORIGINS ??
    "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        callback(null, !origin || allowedOrigins.includes(origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
}));
app.use(express.json());

app.use("/user", UserRoute)


app.get("/", (_req: Request, res: Response) => {
    res.json({ message: "API is running!" });
});

app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`Backend is running on http://localhost:${PORT}`);
});