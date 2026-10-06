import express, { Request, Response } from "express";
import http, { createServer } from "http";
import "dotenv/config";
import UserRoute from "./routes/user.route.js"

const app = express();
const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(app)

app.use(express.json());

app.use("/user", UserRoute)


app.get("/", (_req: Request, res: Response) => {
    res.json({ message: "API is running!" });
});

app.post('/exotel-stream-url', (req, res) => {
    res.json({ url: `wss://${req.get('host')}/media` });
});

app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
});

server.listen(PORT, () => {
    console.log(`Backend is running on http://localhost:${PORT}`);
});