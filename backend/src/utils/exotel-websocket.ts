import WebSocket, { WebSocketServer } from "ws";
import { openGeminiLive } from "../ai/gemini-live.js";
import { upsample8to16 } from "./audio-resampling.js";
import { normalizePhone } from "./whatsapp-msg.js";

export function setupWebSocketServer(server: any) {
    const wss = new WebSocketServer({ server, path: "/media" });

    wss.on("connection", (ws: WebSocket) => {
        console.log("[exotel] websocket connected");

        const session: {
            exotelWs: WebSocket;
            gem: WebSocket | null;
            streamSid: string | null;
            callSid: string | null;
            callerNumber: string | null;
            ready: boolean;
            outBuf: Buffer;
            dsRem: Buffer;
            endAfterTurn: boolean;
            closing: boolean;
        } = {
            exotelWs: ws,
            gem: null,
            streamSid: null,
            callSid: null,
            callerNumber: null,
            ready: false,
            outBuf: Buffer.alloc(0),
            dsRem: Buffer.alloc(0),
            endAfterTurn: false,
            closing: false,
        };

        ws.on("message", (raw: any) => {
            let msg;
            try {
                msg = JSON.parse(raw.toString());
            } catch {
                return;
            }

            switch (msg.event) {
                case "connected":
                    break;

                case "start":
                    session.streamSid = msg.start?.stream_sid || msg.stream_sid || null;
                    session.callSid = msg.start?.call_sid || null;
                    session.callerNumber = normalizePhone(msg.start?.from) || null;
                    console.log("[exotel] call started", session.callSid, "from", session.callerNumber);
                    openGeminiLive(session);
                    break;

                case "media":
                    if (session.ready && session.gem?.readyState === WebSocket.OPEN) {
                        const pcm8 = Buffer.from(msg.media.payload, "base64");
                        session.gem.send(
                            JSON.stringify({
                                realtimeInput: {
                                    audio: { data: upsample8to16(pcm8).toString("base64"), mimeType: "audio/pcm;rate=16000" },
                                },
                            })
                        );
                    }
                    break;

                case "mark":
                    if (msg.mark?.name === "final_message") {
                        console.log("[exotel] final message played, hanging up");
                        ws.close();
                    }
                    break;

                case "stop":
                    console.log("[exotel] stream stopped");
                    break;

                default:
                    break;
            }
        });

        ws.on("close", () => {
            console.log("[exotel] websocket closed");
            session.closing = true;
            if (session.gem && session.gem.readyState === WebSocket.OPEN) session.gem.close();
        });

        ws.on("error", (err: any) => console.error("[exotel] ws error:", err.message));
    });
}
