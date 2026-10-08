import type { CallOutcome } from "./dashboardTypes";

export const dateFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });
export const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

export const OUTCOME: Record<CallOutcome, { label: string; className: string }> = {
    booked: {
        label: "Booked",
        className: "bg-[color-mix(in_srgb,var(--secondary)_16%,transparent)] text-brand-text-h",
    },
    answered: { label: "Answered", className: "bg-brand-code-bg text-brand-text-h" },
    transferred: {
        label: "Transferred",
        className: "bg-[color-mix(in_srgb,var(--accent)_28%,transparent)] text-brand-text-h",
    },
    missed: {
        label: "Missed",
        className: "bg-[color-mix(in_srgb,var(--danger,#C92A2A)_12%,transparent)] text-brand-danger",
    },
};

export function fmtDuration(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}
