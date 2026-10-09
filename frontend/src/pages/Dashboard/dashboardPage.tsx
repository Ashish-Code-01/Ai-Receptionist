import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../constants/apis";
import type { DashboardData, DashboardTab } from "./tabs/dashboardTypes";
import AppointmentsTab from "./tabs/AppointmentsTab";
import CallsTab from "./tabs/CallsTab";
import OverviewTab from "./tabs/OverviewTab";
import SettingsTab from "./tabs/SettingsTab";
import { dateFmt } from "./tabs/dashboardFormatters";

type DashboardProps = {
    productName?: string;
};

const USE_DEMO_DATA = true;
const SESSION_URL = `${API_BASE_URL}/user/session`;
const DASHBOARD_URL = `${API_BASE_URL}/user/dashboard`;
const LOGOUT_URL = `${API_BASE_URL}/user/logout`;

const NAV = [
    { id: "overview", label: "Overview", Icon: GridIcon },
    { id: "calls", label: "Calls", Icon: PhoneIcon },
    { id: "appointments", label: "Appointments", Icon: CalendarIcon },
    { id: "settings", label: "Settings", Icon: SettingsIcon },
] as const;

function greeting(hour: number) {
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

function buildDemoData(): DashboardData {
    const now = Date.now();
    const min = 60_000;
    const iso = (offsetMin: number) => new Date(now + offsetMin * min).toISOString();
    const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
    const counts = [31, 44, 38, 52, 47, 29, 36];

    return {
        user: { full_name: "Ashish" },
        stats: { callsToday: 36, bookingsToday: 14, missedToday: 2, avgDurationSec: 134 },
        weekly: counts.map((calls, i) => ({
            day: dayFmt.format(new Date(now - (6 - i) * 86_400_000)),
            calls,
        })),
        liveCall: { caller: "Priya Sharma", startedAt: iso(-1) },
        recentCalls: [
            { id: "c1", caller: "Rahul Mehta", phone: "+91 97•••• ••08", at: iso(-12), durationSec: 168, outcome: "booked", summary: "Booked a dental check-up for Friday, 10:30." },
            { id: "c2", caller: "Unknown caller", phone: "+91 88•••• ••45", at: iso(-35), durationSec: 0, outcome: "missed", summary: "Hung up before the greeting finished." },
            { id: "c3", caller: "Neha Kulkarni", phone: "+91 99•••• ••73", at: iso(-58), durationSec: 96, outcome: "answered", summary: "Asked for clinic timings and parking details." },
            { id: "c4", caller: "Sameer Joshi", phone: "+91 90•••• ••12", at: iso(-84), durationSec: 241, outcome: "transferred", summary: "Billing dispute, transferred to front desk." },
            { id: "c5", caller: "Anita Desai", phone: "+91 98•••• ••60", at: iso(-120), durationSec: 142, outcome: "booked", summary: "Rescheduled Thursday visit to Monday, 9:00." },
        ],
        appointments: [
            { id: "a1", patient: "Kiran Patil", at: iso(25), reason: "Root canal follow-up", status: "confirmed" },
            { id: "a2", patient: "Meera Nair", at: iso(80), reason: "General check-up", status: "confirmed" },
            { id: "a3", patient: "Rahul Mehta", at: iso(190), reason: "Dental check-up", status: "pending" },
            { id: "a4", patient: "Farhan Shaikh", at: iso(260), reason: "Teeth cleaning", status: "confirmed" },
        ],
    };
}

async function fetchDashboard(): Promise<DashboardData> {
    if (USE_DEMO_DATA) return buildDemoData();
    const res = await axios.get<DashboardData>(DASHBOARD_URL, { withCredentials: true });
    return res.data;
}


const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function GridIcon() {
    return (<svg {...iconProps} aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>);
}
function PhoneIcon() {
    return (<svg {...iconProps} aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>);
}
function CalendarIcon() {
    return (<svg {...iconProps} aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>);
}
function SettingsIcon() {
    return (<svg {...iconProps} aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>);
}
function LogoutIcon() {
    return (<svg {...iconProps} aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>);
}
function MenuIcon() {
    return (<svg {...iconProps} aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>);
}

function DashboardSkeleton() {
    return (
        <div className="grid gap-5" aria-busy="true" aria-label="Loading dashboard">
            <div className="grid grid-cols-4 gap-4 max-[1000px]:grid-cols-2 max-[500px]:grid-cols-1">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-[7.5rem] animate-pulse rounded-[16px] bg-brand-code-bg motion-reduce:animate-none" />
                ))}
            </div>
            <div className="h-64 animate-pulse rounded-[20px] bg-brand-code-bg motion-reduce:animate-none" />
        </div>
    );
}

export default function DashboardPage({ productName = "Receptionist" }: DashboardProps) {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [navOpen, setNavOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
    const [aiOn, setAiOn] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        let cancelled = false;

        axios.get(SESSION_URL, { withCredentials: true })
            .then(() => fetchDashboard())
            .then((d) => {
                if (!cancelled) setData(d);
            })
            .catch((err) => {
                if (cancelled) return;
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    navigate("/login", { replace: true });
                    return;
                }
                setError(
                    axios.isAxiosError(err) && !err.response
                        ? "Network error. Check your connection."
                        : "Could not load your dashboard. Please try again."
                );
            });

        return () => {
            cancelled = true;
        };
    }, [reloadKey, navigate]);

    useEffect(() => {
        if (!navOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [navOpen]);

    const handleLogout = useCallback(async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            await axios.post(LOGOUT_URL, null, { withCredentials: true });
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            navigate("/login", { replace: true });
        }
    }, [loggingOut, navigate]);

    const now = new Date();
    const firstName = data?.user.full_name.trim().split(/\s+/)[0] ?? "";

    const asideClass = `flex flex-col justify-between gap-6 border-r border-brand-border bg-brand-surface p-5 min-[801px]:sticky min-[801px]:top-0 min-[801px]:h-screen ${navOpen
        ? "max-[800px]:fixed max-[800px]:inset-y-0 max-[800px]:left-0 max-[800px]:z-30 max-[800px]:w-64 max-[800px]:shadow-brand"
        : "max-[800px]:hidden"
        }`;

    return (
        <div className="min-h-screen bg-brand-bg font-[family-name:var(--sans)] text-brand-text min-[801px]:grid min-[801px]:grid-cols-[15rem_minmax(0,1fr)]">
            {navOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-20 cursor-pointer border-0 bg-black/40 min-[801px]:hidden"
                    aria-label="Close menu"
                    onClick={() => setNavOpen(false)}
                />
            )}

            <aside className={asideClass}>
                <div className="grid gap-8">
                    <Link
                        to="/"
                        className="flex w-fit items-center gap-[.65rem] font-[family-name:var(--heading)] text-[1.1rem] font-bold text-brand-text-h no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
                    >
                        <span className="grid size-9 place-items-center rounded-[10px] bg-brand-primary text-brand-on-primary"><PhoneIcon /></span>
                        {productName}
                    </Link>

                    <nav aria-label="Main">
                        <ul className="m-0 grid list-none gap-1 p-0">
                            {NAV.map(({ id, label, Icon }) => (
                                <li key={id}>
                                    <button
                                        type="button"
                                        aria-current={activeTab === id ? "page" : undefined}
                                        onClick={() => {
                                            setActiveTab(id);
                                            setNavOpen(false);
                                        }}
                                        className={`flex w-full cursor-pointer items-center gap-3 rounded-[10px] border-0 px-3 py-2.5 text-left font-[inherit] text-[.92rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] motion-reduce:transition-none ${activeTab === id
                                            ? "bg-brand-primary text-brand-on-primary"
                                            : "bg-transparent text-brand-muted hover:bg-brand-code-bg hover:text-brand-text-h"
                                            }`}
                                    >
                                        <Icon />
                                        {label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex cursor-pointer items-center gap-3 rounded-[10px] border-0 bg-transparent px-3 py-2.5 font-[inherit] text-[.92rem] font-semibold text-brand-muted transition-colors hover:bg-brand-code-bg hover:text-brand-text-h disabled:cursor-progress disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] motion-reduce:transition-none"
                >
                    <LogoutIcon />
                    {loggingOut ? "Signing out..." : "Sign out"}
                </button>
            </aside>

            <div className="min-w-0">
                <header className="flex items-center justify-between border-b border-brand-border bg-brand-surface px-4 py-3 min-[801px]:hidden">
                    <button
                        type="button"
                        onClick={() => setNavOpen(true)}
                        aria-label="Open menu"
                        aria-expanded={navOpen}
                        className="grid size-10 cursor-pointer place-items-center rounded-[10px] border border-brand-border bg-brand-bg text-brand-text-h focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    >
                        <MenuIcon />
                    </button>
                    <span className="font-[family-name:var(--heading)] font-bold text-brand-text-h">{productName}</span>
                    <span className="size-10" aria-hidden="true" />
                </header>

                <main className="mx-auto grid w-full max-w-[72rem] gap-5 px-5 py-6 max-[800px]:px-4">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="m-0 text-[.85rem] text-brand-muted">{dateFmt.format(now)}</p>
                            <h1 className="m-0 mt-1 font-[family-name:var(--heading)] text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.1] tracking-[-.02em] text-brand-text-h">
                                {activeTab === "overview"
                                    ? `${greeting(now.getHours())}${firstName ? `, ${firstName}` : ""}`
                                    : NAV.find(({ id }) => id === activeTab)?.label}
                            </h1>
                        </div>
                    </div>

                    {error && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-brand-danger bg-[color-mix(in_srgb,var(--danger,#C92A2A)_8%,transparent)] px-4 py-3 text-[.92rem] text-brand-danger" role="alert">
                            <span>{error}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setError("");
                                    setReloadKey((k) => k + 1);
                                }}
                                className="cursor-pointer rounded-[8px] border border-brand-danger bg-transparent px-3 py-1.5 font-[inherit] text-[.85rem] font-semibold text-brand-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {!data && !error && <DashboardSkeleton />}

                    {data && activeTab === "overview" && (
                        <OverviewTab data={data} onSelectTab={setActiveTab} />
                    )}
                    {data && activeTab === "calls" && <CallsTab data={data} />}
                    {data && activeTab === "appointments" && <AppointmentsTab data={data} />}
                    {activeTab === "settings" && (
                        <SettingsTab enabled={aiOn} onChange={setAiOn} />
                    )}
                </main>
            </div>
        </div>
    );
}