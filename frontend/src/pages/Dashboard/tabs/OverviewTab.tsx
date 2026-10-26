import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../constants/apis";
import { formatCurrency } from "../../../utils/format";
import type { DashboardData } from "./dashboardTypes";
import { fmtDuration } from "./dashboardFormatters";
import { AppointmentList, Card, CallList, LiveCall, Stat } from "./dashboardUi";
import WhatsAppCard from "../../../components/WhatsAppCard";

type RevenueSummary = {
    today: { amount: number; payments: number };
};

type QueueSummary = {
    tokens: { status: "waiting" | "ongoing" | "done" | "cancelled"; payment_status: "pending" | "paid" | "waived"; patient_name: string }[];
};

type SummaryState<T> = {
    data: T | null;
    error: boolean;
};

type OverviewTabProps = {
    data: DashboardData;
    onSelectTab: (tab: "calls" | "appointments" | "queue" | "revenue") => void;
};

export default function OverviewTab({ data, onSelectTab }: OverviewTabProps) {
    const { stats } = data;
    const [revenue, setRevenue] = useState<SummaryState<RevenueSummary>>({ data: null, error: false });
    const [queue, setQueue] = useState<SummaryState<QueueSummary>>({ data: null, error: false });
    const answerRate = stats.callsToday > 0
        ? Math.round(((stats.callsToday - stats.missedToday) / stats.callsToday) * 100)
        : null;
    const weeklyMax = Math.max(1, ...data.weekly.map(({ calls }) => calls));

    useEffect(() => {
        const businessId = data.business?.id;
        if (!businessId) return;

        let cancelled = false;
        let timer = 0;
        let controller: AbortController | null = null;

        const load = async () => {
            controller = new AbortController();
            const options = { withCredentials: true, signal: controller.signal };
            const [revenueResult, queueResult] = await Promise.allSettled([
                axios.get<{ success: boolean; data: RevenueSummary }>(
                    `${API_BASE_URL}/details/${businessId}/revenue`, options,
                ),
                axios.get<{ success: boolean; data: QueueSummary }>(
                    `${API_BASE_URL}/details/${businessId}/queue`, options,
                ),
            ]);

            if (cancelled) return;
            if (revenueResult.status === "fulfilled") {
                setRevenue({ data: revenueResult.value.data.data, error: false });
            } else {
                setRevenue((current) => ({ ...current, error: true }));
            }
            if (queueResult.status === "fulfilled") {
                setQueue({ data: queueResult.value.data.data, error: false });
            } else {
                setQueue((current) => ({ ...current, error: true }));
            }
            timer = window.setTimeout(() => void load(), 15_000);
        };

        void load();
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            controller?.abort();
        };
    }, [data.business?.id]);

    const queueTokens = queue.data?.tokens ?? [];
    const waitingCount = queueTokens.filter((token) => token.status === "waiting").length;
    const activeToken = queueTokens.find((token) => token.status === "ongoing");
    const pendingPayments = queueTokens.filter((token) => token.payment_status === "pending").length;

    return (
        <>
            <WhatsAppCard />
            {data.liveCall && <LiveCall caller={data.liveCall.caller} startedAt={data.liveCall.startedAt} />}
            <div className="grid grid-cols-4 gap-4 max-[1000px]:grid-cols-2 max-[500px]:grid-cols-1">
                <Stat label="Calls today" value={String(stats.callsToday)} hint={`${stats.missedToday} missed`} />
                <Stat label="Appointments booked" value={String(stats.bookingsToday)} hint="Booked by your receptionist" />
                <Stat label="Answer rate" value={answerRate === null ? "-" : `${answerRate}%`} hint="Calls picked up today" />
                <Stat label="Average call" value={fmtDuration(stats.avgDurationSec)} hint="Across answered calls" />
            </div>
            {data.business ? <div className="grid grid-cols-2 gap-5 max-[600px]:grid-cols-1">
                <Card
                    title="Today’s revenue"
                    id="overview-revenue-title"
                    action={<button type="button" onClick={() => onSelectTab("revenue")} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[.85rem] font-semibold text-brand-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">View revenue</button>}
                >
                    {revenue.error && !revenue.data ? (
                        <p role="alert" className="m-0 text-sm text-brand-danger">Could not load revenue summary.</p>
                    ) : revenue.data ? (
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="m-0 text-sm text-brand-muted">Collected</p>
                                <p className="mb-0 mt-1 font-[family-name:var(--heading)] text-2xl font-bold tabular-nums text-brand-text-h">{formatCurrency(revenue.data.today.amount, { compact: true })}</p>
                            </div>
                            <p className="m-0 text-sm text-brand-muted">{revenue.data.today.payments} paid visits</p>
                        </div>
                    ) : (
                        <div className="h-12 animate-pulse rounded-lg bg-brand-code-bg motion-reduce:animate-none" aria-label="Loading revenue summary" />
                    )}
                </Card>
                <Card
                    title="Today’s walk-in queue"
                    id="overview-queue-title"
                    action={<button type="button" onClick={() => onSelectTab("queue")} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[.85rem] font-semibold text-brand-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">Manage queue</button>}
                >
                    {queue.error && !queue.data ? (
                        <p role="alert" className="m-0 text-sm text-brand-danger">Could not load queue summary.</p>
                    ) : queue.data ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="m-0 text-sm text-brand-muted">Waiting</p>
                                <p className="mb-0 mt-1 font-[family-name:var(--heading)] text-2xl font-bold tabular-nums text-brand-text-h">{waitingCount}</p>
                            </div>
                            <div>
                                <p className="m-0 text-sm text-brand-muted">Pending payments</p>
                                <p className="mb-0 mt-1 font-[family-name:var(--heading)] text-2xl font-bold tabular-nums text-brand-text-h">{pendingPayments}</p>
                            </div>
                            {activeToken && <p className="col-span-2 m-0 truncate text-sm text-brand-muted">Now seeing: <span className="font-semibold text-brand-text-h">{activeToken.patient_name}</span></p>}
                        </div>
                    ) : (
                        <div className="h-12 animate-pulse rounded-lg bg-brand-code-bg motion-reduce:animate-none" aria-label="Loading queue summary" />
                    )}
                </Card>
            </div> : (
                <Card title="Revenue and walk-in queue" id="overview-business-summary-title">
                    <p className="m-0 text-sm text-brand-muted">Create a business profile to see its revenue and walk-in queue summary.</p>
                </Card>
            )}
            <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 max-[1000px]:grid-cols-1">
                <Card title="Calls this week" id="weekly-title">
                    <div
                        className="flex h-44 items-end gap-3"
                        role="img"
                        aria-label={`Calls per day: ${data.weekly.map(({ day, calls }) => `${day} ${calls}`).join(", ")}`}
                    >
                        {data.weekly.map((day, index) => {
                            const isToday = index === data.weekly.length - 1;
                            return (
                                <div key={`${day.day}-${index}`} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5 text-center">
                                    <span className="text-[.75rem] tabular-nums text-brand-muted">{day.calls}</span>
                                    <div
                                        className={`w-full rounded-t-[6px] ${isToday ? "bg-brand-primary" : "bg-brand-primary/30"}`}
                                        style={{ height: `${Math.max(4, (day.calls / weeklyMax) * 100)}%` }}
                                    />
                                    <span className={`text-[.75rem] ${isToday ? "font-semibold text-brand-text-h" : "text-brand-muted"}`}>{day.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
                <Card
                    title="Today's appointments"
                    id="appointments-title"
                    action={<button type="button" onClick={() => onSelectTab("appointments")} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[.85rem] font-semibold text-brand-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">View all</button>}
                >
                    <AppointmentList appointments={data.appointments} />
                </Card>
            </div>
            <Card
                title="Recent calls"
                id="calls-title"
                action={<button type="button" onClick={() => onSelectTab("calls")} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[.85rem] font-semibold text-brand-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">View all</button>}
            >
                <CallList calls={data.recentCalls} />
            </Card>
        </>
    );
}
