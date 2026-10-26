import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../../constants/apis";
import ConnectWhatsApp from "../../../components/ConnectWhatsApp";
import { Card } from "./dashboardUi";

type IntegrationStatus = {
    calendarConnected: boolean;
    whatsapp: { display_phone: string; status: "active" | "disconnected" } | null;
};

type LoadedIntegrationStatus = IntegrationStatus & { businessId: number };

type SettingsTabProps = {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    businessId: number | null;
};

export default function SettingsTab({ enabled, onChange, businessId }: SettingsTabProps) {
    const navigate = useNavigate();
    const [status, setStatus] = useState<LoadedIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<"calendar" | "whatsapp" | null>(null);
    const [error, setError] = useState("");
    const [errorBusinessId, setErrorBusinessId] = useState<number | null>(null);
    const [notice, setNotice] = useState("");
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        if (!businessId) {
            return;
        }

        const controller = new AbortController();
        Promise.all([
            axios.get<{ success: boolean; data: { calendarConnected: boolean } }>(
                `${API_BASE_URL}/details/${businessId}`,
                { withCredentials: true, signal: controller.signal },
            ),
            axios.get<IntegrationStatus["whatsapp"]>(
                `${API_BASE_URL}/whatsapp/status`,
                { withCredentials: true, signal: controller.signal },
            ),
        ]).then(([detailsResponse, whatsappResponse]) => {
            setErrorBusinessId(null);
            setStatus({
                businessId,
                calendarConnected: detailsResponse.data.data.calendarConnected,
                whatsapp: whatsappResponse.data,
            });
        }).catch((requestError: unknown) => {
            if (controller.signal.aborted) return;
            console.error("Could not load integration settings", requestError);
            setErrorBusinessId(businessId);
            setError("Could not load connection settings. Please try again.");
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });

        return () => controller.abort();
    }, [businessId, retryKey]);
    const currentStatus = status?.businessId === businessId ? status : null;
    const currentError = errorBusinessId === businessId ? error : "";
    const statusLoading = loading || (Boolean(businessId) && !currentStatus && !currentError);

    const disconnect = async (integration: "calendar" | "whatsapp") => {
        if (!businessId || busy) return;
        const label = integration === "calendar" ? "Google Calendar" : "WhatsApp";
        const message = integration === "calendar"
            ? "Disconnect Google Calendar? Appointment scheduling will stop until you connect it again."
            : "Disconnect WhatsApp? WhatsApp confirmations will stop until you connect it again.";
        if (!window.confirm(message)) return;

        setBusy(integration);
        setErrorBusinessId(null);
        setError("");
        setNotice("");
        try {
            if (integration === "calendar") {
                await axios.delete(`${API_BASE_URL}/details/${businessId}/calendar`, { withCredentials: true });
                setStatus((current) => current?.businessId === businessId
                    ? { ...current, calendarConnected: false }
                    : current);
            } else {
                await axios.post(`${API_BASE_URL}/whatsapp/disconnect`, {}, { withCredentials: true });
                setStatus((current) => current?.businessId === businessId && current.whatsapp
                    ? { ...current, whatsapp: { ...current.whatsapp, status: "disconnected" } }
                    : current);
            }
            setNotice(`${label} disconnected. Reconnect it to resume ${integration === "calendar" ? "calendar scheduling" : "WhatsApp confirmations"}.`);
        } catch (requestError: unknown) {
            console.error(`Could not disconnect ${label}`, requestError);
            setErrorBusinessId(businessId);
            setError(`Could not disconnect ${label}. Please try again.`);
        } finally {
            setBusy(null);
        }
    };

    const reconnectCalendar = () => {
        if (businessId) {
            window.location.assign(
                `${API_BASE_URL}/user/google?flow=calendar&businessId=${businessId}&source=settings`,
            );
        }
    };

    const reconnectWhatsApp = () => {
        if (businessId) navigate(`/details?businessId=${businessId}`);
    };

    return (
        <div className="grid gap-5">
            <Card title="Receptionist settings" id="settings-title">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="m-0 text-[.92rem] font-semibold text-brand-text-h">Answer incoming calls</p>
                        <p className="m-0 text-[.85rem] text-brand-muted">Turn your AI receptionist on or off.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label="Answer incoming calls"
                        onClick={() => onChange(!enabled)}
                        className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] motion-reduce:transition-none ${enabled ? "bg-brand-secondary" : "bg-brand-border"}`}
                    >
                        <span className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${enabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                </div>
            </Card>

            <Card title="Connected services" id="integration-settings-title">
                {!businessId ? (
                    <p className="m-0 text-sm text-brand-muted">Create a business profile to manage connected services.</p>
                ) : statusLoading && !currentStatus ? (
                    <div className="grid gap-3" role="status" aria-label="Loading connected services">
                        <div className="h-20 animate-pulse rounded-xl bg-brand-code-bg motion-reduce:animate-none" />
                        <div className="h-20 animate-pulse rounded-xl bg-brand-code-bg motion-reduce:animate-none" />
                    </div>
                ) : currentError && !currentStatus ? (
                    <div>
                        <p role="alert" className="m-0 text-sm text-brand-danger">{currentError}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setLoading(true);
                                setError("");
                                setErrorBusinessId(null);
                                setRetryKey((current) => current + 1);
                            }}
                            className="mt-3 cursor-pointer rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-semibold text-brand-text-h focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <IntegrationRow
                            name="Google Calendar"
                            connected={currentStatus?.calendarConnected ?? false}
                            busy={busy === "calendar"}
                            onDisconnect={() => void disconnect("calendar")}
                            onReconnect={reconnectCalendar}
                        />
                        <section className="grid gap-3 rounded-xl border border-brand-border bg-brand-bg/30 p-4" aria-label="WhatsApp">
                            <IntegrationRow
                                name="WhatsApp"
                                connected={currentStatus?.whatsapp?.status === "active"}
                                busy={busy === "whatsapp"}
                                onDisconnect={() => void disconnect("whatsapp")}
                                onReconnect={reconnectWhatsApp}
                                detail={currentStatus?.whatsapp?.status === "active"
                                    ? currentStatus.whatsapp.display_phone
                                    : "Disconnected — reconnect to resume WhatsApp confirmations."}
                            />
                            {currentStatus?.whatsapp?.status !== "active" && (
                                <ConnectWhatsApp
                                    onConnected={(phone) => {
                                        setStatus((current) => current
                                            ? { ...current, whatsapp: { display_phone: phone, status: "active" } }
                                            : current);
                                        setNotice("");
                                        setError("");
                                    }}
                                />
                            )}
                        </section>
                    </div>
                )}
                {currentError && currentStatus && <p role="alert" className="mb-0 mt-4 text-sm text-brand-danger">{currentError}</p>}
                {notice && <p role="status" className="mb-0 mt-4 text-sm text-brand-text-h">{notice}</p>}
            </Card>
        </div>
    );
}

function IntegrationRow({
    name,
    connected,
    busy,
    onDisconnect,
    onReconnect,
    detail,
}: {
    name: string;
    connected: boolean;
    busy: boolean;
    onDisconnect: () => void;
    onReconnect: () => void;
    detail?: string;
}) {
    return (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-bg/30 p-4" aria-label={name}>
            <div>
                <p className="m-0 font-semibold text-brand-text-h">{name}</p>
                <p className="m-0 text-sm text-brand-muted">
                    {detail ?? (connected ? "Connected" : "Disconnected — reconnect to resume this service.")}
                </p>
            </div>
            {connected ? (
                <button
                    type="button"
                    onClick={onDisconnect}
                    disabled={busy}
                    className="cursor-pointer rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-semibold text-brand-text-h focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-wait disabled:opacity-60"
                >
                    {busy ? "Disconnecting…" : "Disconnect"}
                </button>
            ) : name !== "WhatsApp" ? (
                <button
                    type="button"
                    onClick={onReconnect}
                    className="cursor-pointer rounded-lg border-0 bg-brand-primary px-3 py-2 text-sm font-semibold text-brand-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                >
                    Connect again
                </button>
            ) : null}
        </section>
    );
}
