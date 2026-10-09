import { useEffect, useState, type ReactNode } from "react";
import type { Appointment, CallRecord } from "./dashboardTypes";
import { fmtDuration, initials, OUTCOME, timeFmt } from "./dashboardFormatters";

export function Card({ title, id, action, children }: { title: string; id: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section aria-labelledby={id} className="box-border min-w-0 rounded-[20px] border border-brand-border bg-brand-surface p-5 shadow-brand">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id={id} className="m-0 font-[family-name:var(--heading)] text-[1.1rem] font-bold tracking-[-.01em] text-brand-text-h">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
    return (
        <div className="box-border rounded-[16px] border border-brand-border bg-brand-surface p-4 shadow-brand">
            <p className="m-0 text-[.85rem] font-semibold text-brand-muted">{label}</p>
            <p className="mt-1 mb-0 font-[family-name:var(--heading)] text-[1.9rem] font-bold leading-none tracking-[-.02em] tabular-nums text-brand-text-h">{value}</p>
            <p className="mt-2 mb-0 text-[.8rem] text-brand-muted">{hint}</p>
        </div>
    );
}

export function LiveCall({ caller, startedAt }: { caller: string; startedAt: string }) {
    const [elapsed, setElapsed] = useState(() => Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));

    useEffect(() => {
        const id = setInterval(() => {
            setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
        }, 1000);
        return () => clearInterval(id);
    }, [startedAt]);

    const m = Math.floor(elapsed / 60);
    const s = String(elapsed % 60).padStart(2, "0");

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-brand-primary px-5 py-4 text-brand-on-primary" role="status">
            <div className="flex items-center gap-3">
                <i className="size-[.6rem] animate-login-blink rounded-full bg-brand-on-primary motion-reduce:animate-none" aria-hidden="true" />
                <p className="m-0 font-semibold">Live call with {caller}</p>
            </div>
            <span className="tabular-nums text-[.95rem]" aria-label={`Call length ${m} minutes ${s} seconds`}>{m}:{s}</span>
        </div>
    );
}

export function CallList({ calls }: { calls: CallRecord[] }) {
    if (calls.length === 0) {
        return <p className="m-0 text-[.92rem] text-brand-muted">No calls yet. Once your number is connected, calls will appear here.</p>;
    }

    return (
        <ul className="m-0 grid list-none p-0">
            {calls.map((call) => {
                const outcome = OUTCOME[call.outcome];
                return (
                    <li key={call.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-brand-border py-3 first:border-t-0 first:pt-0 last:pb-0 max-[600px]:grid-cols-[2.5rem_minmax(0,1fr)]">
                        <span className="grid size-10 place-items-center rounded-full bg-brand-accent text-[.8rem] font-bold text-[#2B2118]" aria-hidden="true">{initials(call.caller) || "?"}</span>
                        <div className="min-w-0">
                            <p className="m-0 truncate text-[.92rem] font-semibold text-brand-text-h">
                                {call.caller} <span className="font-normal text-brand-muted">{call.phone}</span>
                            </p>
                            <p className="m-0 truncate text-[.85rem] text-brand-muted">{call.summary}</p>
                        </div>
                        <div className="flex items-center gap-3 max-[600px]:col-start-2">
                            <span className={`rounded-full px-2.5 py-1 text-[.75rem] font-semibold ${outcome.className}`}>{outcome.label}</span>
                            <span className="text-[.8rem] tabular-nums text-brand-muted">
                                {timeFmt.format(new Date(call.at))}
                                {call.durationSec > 0 && ` · ${fmtDuration(call.durationSec)}`}
                            </span>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export function AppointmentList({ appointments }: { appointments: Appointment[] }) {
    if (appointments.length === 0) {
        return <p className="m-0 text-[.92rem] text-brand-muted">No appointments yet. New bookings from calls will show up here.</p>;
    }

    return (
        <ol className="m-0 grid list-none gap-3 p-0">
            {appointments.map((appointment) => (
                <li key={appointment.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3">
                    <time dateTime={appointment.at} className="pt-0.5 text-[.88rem] font-semibold tabular-nums text-brand-text-h">{timeFmt.format(new Date(appointment.at))}</time>
                    <div className="min-w-0">
                        <p className="m-0 truncate text-[.92rem] font-semibold text-brand-text-h">{appointment.patient}</p>
                        <p className="m-0 truncate text-[.82rem] text-brand-muted">
                            {appointment.reason}
                            {appointment.status === "pending" && " (awaiting confirmation)"}
                        </p>
                    </div>
                </li>
            ))}
        </ol>
    );
}
