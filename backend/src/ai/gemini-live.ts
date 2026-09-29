
import WebSocket from "ws";
import { buildSystemInstruction, functionDeclarations, executeFunctionCall } from "../utils/ai-tools.js";
import { sendToExotel, queueAudioToExotel, flushAudioToExotel } from "../utils/exotel-senders.js";
import { downsample24to8 } from "../utils/audio-resampling.js";

const GEMINI_WS_URL =
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent" +
    `?key=${process.env.GEMINI_API_KEY ?? ""}`;

export function openGeminiLive(session: any) {
    const gem = new WebSocket(GEMINI_WS_URL);
    session.gem = gem;

    gem.on("open", () => {
        console.log("[gemini] connected, sending setup, model =", process.env.GEMINI_LIVE_MODEL);
        gem.send(
            JSON.stringify({
                setup: {
                    model: `models/${process.env.GEMINI_LIVE_MODEL ?? "gemini-2.5-flash-preview-native-audio"}`,
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: process.env.GEMINI_VOICE ?? "Kore" } } },
                    },
                    systemInstruction: { parts: [{ text: buildSystemInstruction(session.callerNumber ?? "") }] },
                    tools: [{ functionDeclarations }],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            })
        );
    });

    gem.on("message", async (raw: any) => {
        let m;
        try {
            m = JSON.parse(raw.toString());
        } catch {
            return;
        }

        if (m.setupComplete) {
            console.log("[gemini] setup complete");
            session.ready = true;
            gem.send(
                JSON.stringify({
                    realtimeInput: { text: "Caller ne abhi call connect kiya hai. Unhe greet karo aur poocho kya chahiye." },
                })
            );
            return;
        }

        if (m.serverContent) {
            const sc = m.serverContent;

            if (sc.interrupted) {
                session.outBuf = Buffer.alloc(0);
                session.dsRem = Buffer.alloc(0);
                sendToExotel(session, { event: "clear", stream_sid: session.streamSid });
            }

            for (const part of sc.modelTurn?.parts || []) {
                if (part.inlineData?.data) {
                    const pcm24 = Buffer.from(part.inlineData.data, "base64");
                    queueAudioToExotel(session, downsample24to8(session, pcm24));
                }
            }

            if (sc.inputTranscription?.text) console.log("[caller]", sc.inputTranscription.text);
            if (sc.outputTranscription?.text) console.log("[ai]", sc.outputTranscription.text);

            if (sc.turnComplete) {
                flushAudioToExotel(session);
                if (session.endAfterTurn) {
                    sendToExotel(session, { event: "mark", stream_sid: session.streamSid, mark: { name: "final_message" } });
                    setTimeout(() => session.exotelWs?.close(), 8000);
                }
            }
        }

        if (m.toolCall?.functionCalls) {
            const functionResponses: any[] = [];
            for (const fc of m.toolCall.functionCalls) {
                const response = await executeFunctionCall(fc, session);
                functionResponses.push({ id: fc.id, name: fc.name, response });
            }
            gem.send(JSON.stringify({ toolResponse: { functionResponses } }));
        }
    });

    gem.on("error", (err: any) => console.error("[gemini] error:", err.message));
    gem.on("close", (code: number, reason: string) => {
        console.log(`[gemini] closed code=${code} reason=${reason?.toString() || ""}`);
        if (session.exotelWs?.readyState === WebSocket.OPEN && !session.closing) session.exotelWs.close();
    });
}