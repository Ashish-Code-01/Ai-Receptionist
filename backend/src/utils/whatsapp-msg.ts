import axios from "axios";

const BUSINESS_NAME = process.env.BUSINESS_NAME ?? "My Business";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ?? "";

export function normalizePhone(p: unknown) {
    let d = String(p || "").replace(/\D/g, "");
    if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    if (d.length === 10) d = "91" + d;
    return d;
}

export async function sendWhatsAppConfirmation({ phone, name, date, time, service }: { phone: unknown; name: string; date: unknown; time: unknown; service: unknown }) {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_TOKEN) {
        console.warn("WhatsApp config is missing; skipping confirmation message.");
        return;
    }

    const url = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    try {
        await axios.post(
            url,
            {
                messaging_product: "whatsapp",
                to: normalizePhone(phone),
                type: "text",
                text: {
                    body:
                        `Hi ${name}! Aapki appointment ${BUSINESS_NAME} mein confirm ho gayi hai.\n\n` +
                        `Date: ${date}\nTime: ${time}\nService: ${service}\n\n` +
                        `Reschedule karna ho to hume call kar dijiyega. Dhanyavaad!`,
                },
            },
            { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" } }
        );
        console.log("WhatsApp sent to", normalizePhone(phone));
    } catch (err: unknown) {
        const error = err as { response?: { data?: unknown }; message?: string };
        console.error("WhatsApp send failed:", error.response?.data ?? error.message ?? err);
    }
}