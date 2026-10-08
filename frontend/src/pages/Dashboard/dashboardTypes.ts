export type CallOutcome = "booked" | "answered" | "transferred" | "missed";

export type CallRecord = {
    id: string;
    caller: string;
    phone: string;
    at: string;
    durationSec: number;
    outcome: CallOutcome;
    summary: string;
};

export type Appointment = {
    id: string;
    patient: string;
    at: string;
    reason: string;
    status: "confirmed" | "pending";
};

export type DashboardData = {
    user: { full_name: string };
    stats: {
        callsToday: number;
        bookingsToday: number;
        missedToday: number;
        avgDurationSec: number;
    };
    weekly: { day: string; calls: number }[];
    recentCalls: CallRecord[];
    appointments: Appointment[];
    liveCall: { caller: string; startedAt: string } | null;
};

export type DashboardTab = "overview" | "calls" | "appointments" | "settings";
