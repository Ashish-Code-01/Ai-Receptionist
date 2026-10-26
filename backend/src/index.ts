import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";
import UserRoute from "./routes/user.route.js"
import detailsRoute from "./routes/details.route.js"
import cookieParser from "cookie-parser";
import whatsappRoute from "./routes/whatsapp.js";
import whatsappWebhookRoute from "./routes/whatsappWebhook.js";
import publicQueueRoute from "./routes/publicQueue.route.js";
import helmet from "helmet";

const app = express();
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
}));
app.use(express.json({
    limit: "10mb",
    verify: (req, _res, buffer) => {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
    },
}));
app.use(helmet());
app.use(morgan("dev"));
app.set("trust proxy", 1);

app.use("/webhook/whatsapp", whatsappWebhookRoute);
app.use("/user", UserRoute)
app.use("/details", detailsRoute)
app.use("/queue", publicQueueRoute)
app.use("/whatsapp", whatsappRoute)


app.get("/", (_req: Request, res: Response) => {
    res.json({ message: "API is running!" });
});

app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.listen(Number(process.env.PORT) || 8080, () => {
    console.log(`Backend is running on http://localhost:${Number(process.env.PORT) || 8080}`);
});
