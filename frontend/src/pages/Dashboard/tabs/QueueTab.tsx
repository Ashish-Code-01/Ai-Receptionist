import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import qrcode from "qrcode-generator";
import { API_BASE_URL } from "../../../constants/apis";
import { Card } from "./dashboardUi";

type QueueStatus = "waiting" | "ongoing" | "done" | "cancelled";
type PaymentStatus = "pending" | "paid" | "waived";
type PaymentMethod = "cash" | "card" | "upi" | "other";
type QueueToken = {
    id: number;
    token_number: number;
    patient_name: string;
    patient_phone: string;
    status: QueueStatus;
    payment_status: PaymentStatus;
    payment_amount: string | null;
    payment_method: string | null;
    created_at: string;
};
type QueueResponse = { date: string; timezone: string; clinic: string; tokens: QueueToken[] };

const statusLabel: Record<QueueStatus, string> = {
    waiting: "Waiting", ongoing: "Ongoing", done: "Done", cancelled: "Cancelled",
};

export default function QueueTab({ businessId, clinicName }: { businessId: number | null; clinicName: string }) {
    const [queue, setQueue] = useState<QueueResponse | null>(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState<number | null>(null);
    const [amounts, setAmounts] = useState<Record<number, string>>({});
    const [methods, setMethods] = useState<Record<number, PaymentMethod>>({});
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        if (!businessId) return;
        try {
            const response = await axios.get<{ success: boolean; data: QueueResponse }>(
                `${API_BASE_URL}/details/${businessId}/queue`, { withCredentials: true },
            );
            setQueue(response.data.data);
            setError("");
        } catch {
            setError("Could not load today’s walk-in queue.");
        }
    }, [businessId]);

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => void load(), 15_000);
        return () => window.clearInterval(timer);
    }, [load]);

    const patientUrl = useMemo(() => businessId
        ? `${window.location.origin}/queue/${businessId}`
        : "", [businessId]);
    const qrImage = useMemo(() => {
        if (!patientUrl) return "";
        const code = qrcode(0, "M");
        code.addData(patientUrl, "Byte");
        code.make();
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(code.createSvgTag({ cellSize: 5, margin: 4, scalable: true }))}`;
    }, [patientUrl]);

    const updateStatus = async (token: QueueToken, status: QueueStatus) => {
        setBusy(token.id);
        setError("");
        try {
            await axios.patch(`${API_BASE_URL}/details/${businessId}/queue/${token.id}/status`, { status }, { withCredentials: true });
            await load();
        } catch {
            setError("Could not update the token. Refresh and try again.");
        } finally {
            setBusy(null);
        }
    };

    const updatePayment = async (token: QueueToken, status: PaymentStatus) => {
        const amount = Number(amounts[token.id] ?? token.payment_amount ?? 0);
        setBusy(token.id);
        setError("");
        try {
            await axios.patch(
                `${API_BASE_URL}/details/${businessId}/queue/${token.id}/payment`,
                { status, amount, method: methods[token.id] ?? (token.payment_method as PaymentMethod | null) ?? "cash" },
                { withCredentials: true },
            );
            await load();
        } catch (err) {
            setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Could not update payment." : "Could not update payment.");
        } finally {
            setBusy(null);
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(patientUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setError("Could not copy the patient link. Copy it from the link field.");
        }
    };

    if (!businessId) {
        return <Card title="Walk-in queue" id="queue-title"><p className="m-0 text-sm text-brand-muted">Create a clinic profile before enabling walk-in tokens.</p></Card>;
    }

    const tokens = queue?.tokens ?? [];
    const waiting = tokens.filter((token) => token.status === "waiting").length;
    const active = tokens.find((token) => token.status === "ongoing");

    return (
        <div className="grid gap-5">
            <Card title="Patient check-in link" id="queue-link-title" action={<button type="button" onClick={copyLink} className="cursor-pointer rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-semibold text-brand-text-h">{copied ? "Copied" : "Copy link"}</button>}>
                <p className="m-0 mb-3 text-sm text-brand-muted">Share this link or encode it in a QR code for walk-in patients.</p>
                <div className="flex flex-wrap items-center gap-5">
                    <img src={qrImage} alt={`QR code for ${clinicName} patient check-in`} className="size-40 rounded-lg border border-brand-border bg-white p-2" />
                    <div className="min-w-0 flex-1"><p className="mb-2 text-sm font-semibold text-brand-text-h">Scan to join today’s queue</p><input aria-label="Patient check-in URL" readOnly value={patientUrl} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text-h" /></div>
                </div>
            </Card>

            <Card title={`Today’s queue${queue ? ` · ${queue.date}` : ""}`} id="queue-title" action={<span className="rounded-full bg-brand-code-bg px-3 py-1 text-sm text-brand-muted">{waiting} waiting</span>}>
                {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                {active && <p className="mb-4 rounded-xl bg-brand-primary/10 px-4 py-3 text-sm text-brand-text-h"><strong>Now seeing:</strong> Token {String(active.token_number).padStart(3, "0")} · {active.patient_name}</p>}
                {tokens.length === 0 ? (
                    <p className="m-0 text-sm text-brand-muted">No walk-ins yet today. Share the patient check-in link to issue the first token.</p>
                ) : (
                    <div className="grid gap-3">
                        {tokens.map((token) => (
                            <article key={token.id} className="grid gap-3 rounded-xl border border-brand-border p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-primary text-sm font-bold text-brand-on-primary">{String(token.token_number).padStart(3, "0")}</span>
                                    <div className="min-w-0">
                                        <p className="m-0 truncate font-semibold text-brand-text-h">{token.patient_name}</p>
                                        <p className="m-0 text-sm text-brand-muted">{token.patient_phone} · {statusLabel[token.status]}</p>
                                        <p className="m-0 text-xs text-brand-muted">Payment: {token.payment_status}{token.payment_status === "paid" && token.payment_amount ? ` · ₹${Number(token.payment_amount).toFixed(2)}` : ""}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {token.status === "waiting" && <button disabled={busy === token.id} onClick={() => void updateStatus(token, "ongoing")} className="rounded-lg border-0 bg-brand-primary px-3 py-2 text-sm font-semibold text-brand-on-primary disabled:opacity-50">Start</button>}
                                    {token.status === "ongoing" && <button disabled={busy === token.id} onClick={() => void updateStatus(token, "done")} className="rounded-lg border-0 bg-brand-secondary px-3 py-2 text-sm font-semibold text-brand-on-primary disabled:opacity-50">Mark done</button>}
                                    {(token.status === "waiting" || token.status === "ongoing") && <button disabled={busy === token.id} onClick={() => void updateStatus(token, "cancelled")} className="rounded-lg border border-brand-border bg-transparent px-3 py-2 text-sm font-semibold text-brand-muted disabled:opacity-50">Cancel</button>}
                                    {token.status !== "cancelled" && token.payment_status !== "paid" && (
                                        <>
                                            <label className="sr-only" htmlFor={`amount-${token.id}`}>Payment amount in rupees</label>
                                            <input id={`amount-${token.id}`} type="number" min="0.01" step="0.01" placeholder="₹ amount" value={amounts[token.id] ?? ""} onChange={(event) => setAmounts((current) => ({ ...current, [token.id]: event.target.value }))} className="w-24 rounded-lg border border-brand-border bg-brand-bg px-2 py-2 text-sm" />
                                            <label className="sr-only" htmlFor={`method-${token.id}`}>Payment method</label>
                                            <select id={`method-${token.id}`} value={methods[token.id] ?? (token.payment_method as PaymentMethod | null) ?? "cash"} onChange={(event) => setMethods((current) => ({ ...current, [token.id]: event.target.value as PaymentMethod }))} className="rounded-lg border border-brand-border bg-brand-bg px-2 py-2 text-sm">
                                                <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="other">Other</option>
                                            </select>
                                            <button disabled={busy === token.id} onClick={() => void updatePayment(token, "paid")} className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-semibold text-brand-text-h disabled:opacity-50">Mark paid</button>
                                        </>
                                    )}
                                    {token.status !== "cancelled" && token.payment_status === "pending" && <button disabled={busy === token.id} onClick={() => void updatePayment(token, "waived")} className="rounded-lg border-0 bg-transparent px-2 py-2 text-sm text-brand-muted disabled:opacity-50">Waive</button>}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
