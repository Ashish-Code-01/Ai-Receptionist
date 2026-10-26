import type { DateRange, RevenuePreset, RevenuePresetSelection } from "./revenueTypes";

const DAY_MS = 86_400_000;
const PRESETS: RevenuePreset[] = ["today", "yesterday", "last7", "thisMonth", "lastMonth", "custom"];

export function localDate(timezone: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isValidDate(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return date.toISOString().slice(0, 10) === value;
}

export function shiftDate(date: string, amount: number): string {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + amount);
    return value.toISOString().slice(0, 10);
}

export function presetRange(preset: RevenuePreset, today: string): DateRange {
    if (preset === "yesterday") {
        const yesterday = shiftDate(today, -1);
        return { from: yesterday, to: yesterday };
    }
    if (preset === "last7") return { from: shiftDate(today, -6), to: today };
    if (preset === "thisMonth") return { from: `${today.slice(0, 7)}-01`, to: today };
    if (preset === "lastMonth") {
        const firstOfThisMonth = `${today.slice(0, 7)}-01`;
        const lastOfPreviousMonth = shiftDate(firstOfThisMonth, -1);
        return { from: `${lastOfPreviousMonth.slice(0, 7)}-01`, to: lastOfPreviousMonth };
    }
    return { from: today, to: today };
}

export function previousRange(range: DateRange): DateRange {
    const days = Math.round(
        (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / DAY_MS,
    ) + 1;
    const to = shiftDate(range.from, -1);
    return { from: shiftDate(to, -(days - 1)), to };
}

export function rangeLength(range: DateRange): number {
    return Math.round(
        (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / DAY_MS,
    ) + 1;
}

export function readInitialSelection(timezone: string): RevenuePresetSelection {
    const today = localDate(timezone);
    const params = new URLSearchParams(window.location.search);
    const requestedPreset = params.get("preset");
    const preset = PRESETS.includes(requestedPreset as RevenuePreset)
        ? requestedPreset as RevenuePreset
        : "today";
    const from = params.get("from");
    const to = params.get("to");
    if (from && to && isValidDate(from) && isValidDate(to) && (from <= to || preset === "custom")) {
        return { preset, from, to };
    }
    return { preset, ...presetRange(preset, today) };
}

export function updateRangeQuery(selection: RevenuePresetSelection): void {
    const url = new URL(window.location.href);
    url.searchParams.set("from", selection.from);
    url.searchParams.set("to", selection.to);
    url.searchParams.set("preset", selection.preset);
    window.history.replaceState(window.history.state, "", url);
}
