import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../constants/apis";
import ConnectWhatsApp from "./ConnectWhatsApp";

type WhatsAppConnection = {
    display_phone: string;
    status: "active" | "disconnected";
};

const cardClass =
    "grid gap-4 rounded-[20px] border border-brand-border bg-brand-surface p-5 shadow-brand-card";

export default function WhatsAppCard() {
    const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [error, setError] = useState("");
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        axios.get<WhatsAppConnection | null>(
            `${API_BASE_URL}/whatsapp/status`,
            { withCredentials: true },
        ).then((response) => {
            if (!cancelled) setConnection(response.data);
        }).catch((requestError: unknown) => {
            if (cancelled) return;
            console.error("Could not load WhatsApp status", requestError);
            setError("Could not load WhatsApp status. Please try again.");
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [retryKey]);

    const disconnect = async () => {
        setDisconnecting(true);
        setError("");
        try {
            await axios.post(
                `${API_BASE_URL}/whatsapp/disconnect`,
                {},
                { withCredentials: true },
            );
            setConnection((current) => current
                ? { ...current, status: "disconnected" }
                : null);
        } catch (disconnectError) {
            console.error("Could not disconnect WhatsApp", disconnectError);
            setError("Could not disconnect WhatsApp. Please try again.");
        } finally {
            setDisconnecting(false);
        }
    };

    const retry = () => {
        setLoading(true);
        setError("");
        setRetryKey((key) => key + 1);
    };

    return (
        <section className={cardClass} aria-labelledby="whatsapp-card-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 id="whatsapp-card-title" className="m-0 font-[family-name:var(--heading)] text-lg font-bold text-brand-text-h">
                        WhatsApp
                    </h2>
                    <p className="mb-0 mt-1 text-sm text-brand-muted">
                        Connect your business number for automatic AI replies.
                    </p>
                </div>
                {connection?.status === "active" && (
                    <span className="rounded-full bg-brand-secondary/15 px-3 py-1 text-sm font-semibold text-brand-secondary">
                        Connected
                    </span>
                )}
            </div>

            {loading ? (
                <p className="m-0 text-sm text-brand-muted" role="status">Checking WhatsApp connection...</p>
            ) : connection?.status === "active" ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="m-0 font-semibold text-brand-text-h">{connection.display_phone}</p>
                    <button
                        type="button"
                        onClick={() => void disconnect()}
                        disabled={disconnecting}
                        className="cursor-pointer rounded-xl border border-brand-border bg-brand-surface px-4 py-2 font-semibold text-brand-text-h transition hover:bg-brand-code-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
                    >
                        {disconnecting ? "Disconnecting..." : "Disconnect"}
                    </button>
                </div>
            ) : (
                <ConnectWhatsApp
                    onConnected={(phone) => {
                        setConnection({ display_phone: phone, status: "active" });
                        setError("");
                    }}
                />
            )}

            {error && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-brand-danger" role="alert">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={retry}
                        className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-brand-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    >
                        Retry
                    </button>
                </div>
            )}
        </section>
    );
}
