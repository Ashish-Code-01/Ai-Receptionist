import type { DashboardData } from "./dashboardTypes";
import { fmtDuration } from "./dashboardFormatters";
import { AppointmentList, Card, CallList, LiveCall, Stat } from "./dashboardUi";

type OverviewTabProps = {
    data: DashboardData;
    onSelectTab: (tab: "calls" | "appointments") => void;
};

export default function OverviewTab({ data, onSelectTab }: OverviewTabProps) {
    const { stats } = data;
    const answerRate = stats.callsToday > 0
        ? Math.round(((stats.callsToday - stats.missedToday) / stats.callsToday) * 100)
        : null;
    const weeklyMax = Math.max(1, ...data.weekly.map(({ calls }) => calls));

    return (
        <>
            {data.liveCall && <LiveCall caller={data.liveCall.caller} startedAt={data.liveCall.startedAt} />}
            <div className="grid grid-cols-4 gap-4 max-[1000px]:grid-cols-2 max-[500px]:grid-cols-1">
                <Stat label="Calls today" value={String(stats.callsToday)} hint={`${stats.missedToday} missed`} />
                <Stat label="Appointments booked" value={String(stats.bookingsToday)} hint="Booked by your receptionist" />
                <Stat label="Answer rate" value={answerRate === null ? "-" : `${answerRate}%`} hint="Calls picked up today" />
                <Stat label="Average call" value={fmtDuration(stats.avgDurationSec)} hint="Across answered calls" />
            </div>
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
