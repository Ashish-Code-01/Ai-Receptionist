import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Card } from "./dashboardUi";
import { formatCurrency, formatDate } from "../../../utils/format";
import type {
    DateRange,
    RevenueData,
    RevenueDay,
    RevenuePreset,
    RevenuePresetSelection,
} from "./revenueTypes";
import { isValidDate, localDate, presetRange, rangeLength, readInitialSelection, shiftDate, updateRangeQuery } from "./revenueUtils";
import { useRevenue } from "./useRevenue";

const PRESET_OPTIONS: { id: RevenuePreset; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "last7", label: "Last 7 days" },
    { id: "thisMonth", label: "This month" },
    { id: "lastMonth", label: "Last month" },
    { id: "custom", label: "Custom" },
];

type PaymentMethodTotal = { method: "cash" | "upi" | "card" | "other"; amount: number; payments: number };

function PresetChips({ selected, onSelect }: { selected: RevenuePreset; onSelect: (preset: RevenuePreset) => void }) {
    return (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Revenue date range">
            {PRESET_OPTIONS.map((preset) => (
                <button
                    key={preset.id}
                    type="button"
                    aria-pressed={selected === preset.id}
                    onClick={() => onSelect(preset.id)}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                        selected === preset.id
                            ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                            : "border-brand-border bg-brand-surface text-brand-muted hover:text-brand-text-h"
                    }`}
                >
                    {preset.label}
                </button>
            ))}
        </div>
    );
}

function KpiCard({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
    return (
        <section className="min-w-0 rounded-[16px] border border-brand-border bg-brand-surface p-4 shadow-brand" aria-label={label}>
            <p className="m-0 text-sm font-semibold text-brand-muted">{label}</p>
            <p className="mb-0 mt-2 truncate font-[family-name:var(--heading)] text-2xl font-bold tabular-nums text-brand-text-h">{value}</p>
            {delta !== undefined && delta !== null && (
                <p className={`mb-0 mt-2 text-xs font-semibold tabular-nums ${delta >= 0 ? "text-[var(--secondary)]" : "text-brand-danger"}`}>
                    <span aria-hidden="true">{delta >= 0 ? "▲" : "▼"}</span>
                    {" "}{Math.abs(delta).toFixed(1)}% vs previous period
                </p>
            )}
        </section>
    );
}

function KpiSkeletons() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading revenue totals" aria-busy="true">
            {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-[16px] border border-brand-border bg-brand-surface p-4 motion-reduce:animate-none">
                    <div className="h-3 w-1/2 rounded bg-brand-code-bg" />
                    <div className="mt-4 h-7 w-2/3 rounded bg-brand-code-bg" />
                    <div className="mt-3 h-3 w-1/3 rounded bg-brand-code-bg" />
                </div>
            ))}
        </div>
    );
}

function RevenueTrendChart({ days, bestDay }: { days: RevenueDay[]; bestDay: RevenueDay | null }) {
    const maxAmount = Math.max(1, ...days.map((day) => day.amount));

    if (days.length === 1) {
        return (
            <Card title="Revenue trend" id="revenue-trend-title">
                <p className="m-0 text-sm text-brand-muted">Hourly revenue breakdown isn’t available yet.</p>
            </Card>
        );
    }

    return (
        <Card
            title="Revenue trend"
            id="revenue-trend-title"
            action={bestDay ? <span className="text-right text-xs text-brand-muted">Highest: {formatDate(bestDay.date)} · {formatCurrency(bestDay.amount)}</span> : undefined}
        >
            {days.length === 0 ? (
                <p className="m-0 text-sm text-brand-muted">No daily revenue to chart for this range.</p>
            ) : (
                <div className="overflow-x-auto pb-2">
                    <div
                        className="flex h-52 min-w-full items-end gap-2 border-b border-brand-border px-1"
                        role="group"
                        aria-label="Daily revenue bar chart"
                    >
                        {days.map((day) => (
                            <div
                                key={day.date}
                                role="img"
                                aria-label={`${formatDate(day.date)}: ${formatCurrency(day.amount)} from ${day.payments} paid visits`}
                                title={`${formatDate(day.date)} · ${formatCurrency(day.amount)} · ${day.payments} paid visits`}
                                className="flex h-full min-w-9 flex-1 flex-col items-center justify-end gap-2"
                            >
                                <div
                                    className="w-full min-w-2 rounded-t-md bg-brand-primary transition-[height] motion-reduce:transition-none"
                                    style={{ height: `${Math.max(day.amount > 0 ? 4 : 1, (day.amount / maxAmount) * 100)}%` }}
                                />
                                <span className="sr-only">{formatDate(day.date)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex gap-2" aria-hidden="true">
                        {days.map((day) => (
                            <span key={day.date} className="min-w-9 flex-1 truncate text-center text-[.65rem] text-brand-muted">
                                {formatDate(day.date)}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

function PaymentBreakdown({ methods }: { methods?: PaymentMethodTotal[] }) {
    if (!methods) return null;
    const total = methods.reduce((sum, item) => sum + item.amount, 0);
    const labels: Record<PaymentMethodTotal["method"], string> = {
        cash: "Cash",
        upi: "UPI",
        card: "Card",
        other: "Other",
    };
    return (
        <Card title="Payment methods" id="payment-methods-title">
            <ul className="m-0 grid list-none gap-4 p-0">
                {methods.map((item) => {
                    const percentage = total > 0 ? (item.amount / total) * 100 : 0;
                    return (
                        <li key={item.method}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                                <span className="font-medium text-brand-text-h">{labels[item.method]}</span>
                                <span className="tabular-nums text-brand-muted">{formatCurrency(item.amount)} · {percentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-brand-code-bg" aria-hidden="true">
                                <div className="h-full rounded-full bg-brand-primary" style={{ width: `${percentage}%` }} />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}

function RevenueHistoryTable({ days }: { days: RevenueDay[] }) {
    const sortedDays = useMemo(() => [...days].sort((a, b) => b.date.localeCompare(a.date)), [days]);

    if (sortedDays.length === 0) {
        return <p className="m-0 px-1 py-4 text-sm text-brand-muted">No payments found in this range.</p>;
    }

    return (
        <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                <caption className="sr-only">Paid revenue grouped by day</caption>
                <thead className="sticky top-0 z-10 bg-brand-surface">
                    <tr className="border-b border-brand-border text-brand-muted">
                        <th scope="col" className="px-3 py-3 font-semibold">Date</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold">Payments</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedDays.map((day) => (
                        <tr key={day.date} className="border-b border-brand-border last:border-0">
                            <th scope="row" className="px-3 py-3 font-medium text-brand-text-h">{formatDate(day.date)}</th>
                            <td className="px-3 py-3 text-right tabular-nums text-brand-muted">{day.payments}</td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums text-brand-text-h">{formatCurrency(day.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="m-0 border-t border-brand-border px-3 py-3 text-xs text-brand-muted">
                Individual payment details are not available from the current revenue API.
            </p>
        </div>
    );
}

function RevenueSkeleton({ children }: { children: ReactNode }) {
    return (
        <div className="grid gap-4" aria-hidden="true">
            {children}
            <div className="h-64 animate-pulse rounded-[20px] border border-brand-border bg-brand-surface motion-reduce:animate-none" />
            <div className="h-72 animate-pulse rounded-[20px] border border-brand-border bg-brand-surface motion-reduce:animate-none" />
        </div>
    );
}

function sumRevenue(data: RevenueData | null): { amount: number; payments: number } {
    return (data?.days ?? []).reduce(
        (total, day) => ({ amount: total.amount + day.amount, payments: total.payments + day.payments }),
        { amount: 0, payments: 0 },
    );
}

function percentageDelta(current: number, previous: number | undefined): number | null {
    if (previous === undefined || previous <= 0) return null;
    return ((current - previous) / previous) * 100;
}

function downloadCsv(days: RevenueDay[], range: DateRange): void {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [
        ["Date", "Payments", "Total"],
        ...[...days]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((day) => [formatDate(day.date), String(day.payments), formatCurrency(day.amount)]),
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `revenue-${range.from}-to-${range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export default function RevenueTab({ businessId, timezone }: { businessId: number | null; timezone: string }) {
    const [selection, setSelection] = useState<RevenuePresetSelection>(() => readInitialSelection(timezone));
    const [retryKey, setRetryKey] = useState(0);
    const today = localDate(timezone);
    const range = useMemo<DateRange>(() => ({ from: selection.from, to: selection.to }), [selection.from, selection.to]);
    const rangeError = useMemo(() => {
        if (!isValidDate(range.from) || !isValidDate(range.to)) return "Enter valid start and end dates.";
        if (range.to < range.from) return "The end date must be on or after the start date.";
        if (rangeLength(range) > 367) return "Choose a date range of one year or less.";
        return "";
    }, [range]);
    const { data, previous, comparisonUnavailable, loading, error } = useRevenue(
        businessId,
        rangeError ? { from: "", to: "" } : range,
        retryKey,
    );

    useEffect(() => {
        updateRangeQuery(selection);
    }, [selection]);

    const totals = useMemo(() => sumRevenue(data), [data]);
    const previousTotals = useMemo(() => previous ? sumRevenue(previous) : null, [previous]);
    const trendDays = useMemo(() => {
        if (!data || rangeError || rangeLength(range) === 1) return [];
        const amounts = new Map(data.days.map((day) => [day.date, day]));
        const days: RevenueDay[] = [];
        for (let date = range.from; date <= range.to; date = shiftDate(date, 1)) {
            days.push(amounts.get(date) ?? { date, payments: 0, amount: 0 });
        }
        return days;
    }, [data, range, rangeError]);
    const bestDay = useMemo(
        () => [...(data?.days ?? [])].sort((a, b) => b.amount - a.amount)[0] ?? null,
        [data],
    );
    const hasPreviousData = Boolean(previous?.days.length);
    const totalDelta = hasPreviousData ? percentageDelta(totals.amount, previousTotals?.amount) : null;
    const paymentDelta = hasPreviousData ? percentageDelta(totals.payments, previousTotals?.payments) : null;
    const averageDelta = hasPreviousData
        ? percentageDelta(
            totals.payments ? totals.amount / totals.payments : 0,
            previousTotals?.payments ? previousTotals.amount / previousTotals.payments : 0,
        )
        : null;
    const onPresetSelect = (preset: RevenuePreset) => {
        if (preset === "custom") {
            setSelection((current) => ({ ...current, preset }));
            return;
        }
        setSelection({ preset, ...presetRange(preset, today) });
    };
    const onCustomDate = (field: "from" | "to", value: string) => {
        setSelection((current) => ({ ...current, preset: "custom", [field]: value }));
    };

    if (!businessId) {
        return <Card title="Revenue" id="revenue-title"><p className="m-0 text-sm text-brand-muted">Create a clinic profile to track payments.</p></Card>;
    }

    return (
        <div className="grid min-w-0 gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <PresetChips selected={selection.preset} onSelect={onPresetSelect} />
                {selection.preset === "custom" && (
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="grid gap-1 text-sm text-brand-muted">
                            From
                            <input
                                aria-label="Revenue start date"
                                type="date"
                                value={selection.from}
                                onChange={(event) => onCustomDate("from", event.target.value)}
                                className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-brand-text-h focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                            />
                        </label>
                        <label className="grid gap-1 text-sm text-brand-muted">
                            To
                            <input
                                aria-label="Revenue end date"
                                type="date"
                                value={selection.to}
                                onChange={(event) => onCustomDate("to", event.target.value)}
                                className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-brand-text-h focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                            />
                        </label>
                    </div>
                )}
            </div>

            {rangeError && <p role="alert" className="m-0 text-sm text-brand-danger">{rangeError}</p>}

            {loading && !rangeError ? (
                <RevenueSkeleton><KpiSkeletons /></RevenueSkeleton>
            ) : error ? (
                <Card title="Revenue" id="revenue-error-title">
                    <p role="alert" className="m-0 text-sm text-brand-danger">{error}</p>
                    <button
                        type="button"
                        onClick={() => setRetryKey((current) => current + 1)}
                        className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-semibold text-brand-text-h focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    >
                        <RotateCcw size={16} aria-hidden="true" /> Retry
                    </button>
                </Card>
            ) : !rangeError && data ? (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard label="Total collected" value={formatCurrency(totals.amount, { compact: true })} delta={totalDelta} />
                        <KpiCard label="Paid visits" value={totals.payments.toLocaleString("en-IN")} delta={paymentDelta} />
                        <KpiCard
                            label="Average per visit"
                            value={formatCurrency(totals.payments ? totals.amount / totals.payments : 0, { compact: true })}
                            delta={averageDelta}
                        />
                    </div>
                    {comparisonUnavailable && (
                        <p className="-mt-3 m-0 text-xs text-brand-muted">Comparison with the previous period is unavailable.</p>
                    )}

                    <div className={`grid min-w-0 gap-5 ${data.paymentMethods?.length ? "lg:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]" : ""}`}>
                        <RevenueTrendChart days={trendDays} bestDay={rangeLength(range) > 1 ? bestDay : null} />
                        {data.paymentMethods?.length ? <PaymentBreakdown methods={data.paymentMethods} /> : null}
                    </div>

                    <Card
                        title="Revenue history"
                        id="revenue-history-title"
                        action={
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => downloadCsv(data.days, range)}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-semibold text-brand-text-h hover:bg-brand-code-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Download size={16} aria-hidden="true" /> Export CSV
                            </button>
                        }
                    >
                        {data.days.length === 0 ? (
                            <div>
                                <p className="m-0 text-sm text-brand-muted">No payments found in this range.</p>
                                <button
                                    type="button"
                                    onClick={() => setSelection({ preset: "today", ...presetRange("today", today) })}
                                    className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-semibold text-brand-text-h focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                                >
                                    <RotateCcw size={16} aria-hidden="true" /> Reset to Today
                                </button>
                            </div>
                        ) : (
                            <RevenueHistoryTable days={data.days} />
                        )}
                    </Card>
                </>
            ) : null}
        </div>
    );
}
