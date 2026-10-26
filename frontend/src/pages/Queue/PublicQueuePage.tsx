import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../constants/apis";

type ClinicQueueInfo = { businessName: string; date: string; waitingCount: number; lastToken: number };
type TokenReceipt = { businessName: string; date: string; tokenNumber: number };

export default function PublicQueuePage() {
    const { businessId } = useParams();
    const [clinic, setClinic] = useState<ClinicQueueInfo | null>(null);
    const [receipt, setReceipt] = useState<TokenReceipt | null>(null);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [website, setWebsite] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!businessId) return;
        axios.get<{ success: boolean; data: ClinicQueueInfo }>(`${API_BASE_URL}/queue/${businessId}`)
            .then((response) => setClinic(response.data.data))
            .catch(() => setError("This clinic’s walk-in queue is unavailable right now."));
    }, [businessId]);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!businessId) return;
        setLoading(true);
        setError("");
        try {
            const response = await axios.post<{ success: boolean; data: TokenReceipt }>(
                `${API_BASE_URL}/queue/${businessId}/tokens`, { name, phone, website },
            );
            setReceipt(response.data.data);
        } catch (err) {
            setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Could not issue a token." : "Could not issue a token.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="grid min-h-screen place-items-center bg-brand-bg px-4 py-8 text-brand-text">
            <section className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-brand sm:p-8">
                <p className="m-0 text-sm font-semibold uppercase tracking-[.12em] text-brand-primary">Walk-in check-in</p>
                <h1 className="mb-2 mt-2 font-[family-name:var(--heading)] text-2xl font-bold text-brand-text-h">{receipt?.businessName ?? clinic?.businessName ?? "Clinic queue"}</h1>
                {receipt ? (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-brand-muted">Your token for {receipt.date}</p>
                        <p className="my-3 font-[family-name:var(--heading)] text-7xl font-extrabold tracking-tight text-brand-primary">{String(receipt.tokenNumber).padStart(3, "0")}</p>
                        <p className="m-0 text-sm text-brand-muted">Please show this number at the clinic desk.</p>
                        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl border border-brand-border bg-transparent px-4 py-2 font-semibold text-brand-text-h">Done</button>
                    </div>
                ) : (
                    <>
                        <p className="m-0 mb-5 text-sm text-brand-muted">Join today’s walk-in line. Your token is issued immediately after check-in.</p>
                        {clinic && <p className="mb-5 rounded-xl bg-brand-code-bg px-4 py-3 text-sm text-brand-text-h">{clinic.waitingCount} waiting · {clinic.lastToken ? `Latest token ${String(clinic.lastToken).padStart(3, "0")}` : "You can be first today"}</p>}
                        <form onSubmit={submit} className="grid gap-4">
                            <label className="grid gap-1.5 text-sm font-semibold text-brand-text-h">Your name<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl border border-brand-border bg-brand-bg px-3 py-3 font-normal" /></label>
                            <label className="grid gap-1.5 text-sm font-semibold text-brand-text-h">Phone number<input required type="tel" minLength={7} maxLength={20} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-xl border border-brand-border bg-brand-bg px-3 py-3 font-normal" /></label>
                            <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
                            {error && <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                            <button type="submit" disabled={!clinic || loading} className="mt-1 rounded-xl border-0 bg-brand-primary px-4 py-3 font-semibold text-brand-on-primary disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Joining queue…" : "Get my token"}</button>
                        </form>
                        <p className="mb-0 mt-4 text-center text-xs text-brand-muted">Your details are shared with the clinic to manage your visit.</p>
                    </>
                )}
            </section>
        </main>
    );
}
