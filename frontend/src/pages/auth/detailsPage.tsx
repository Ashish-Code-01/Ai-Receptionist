import { useCallback, useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
    ArrowRight,
    Building2,
    CalendarDays,
    Check,
    Clock3,
    Globe2,
    LoaderCircle,
    MessageCircle,
    Mic2,
    Sparkles,
    X,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../../constants/apis";

/* ============================================================
   Types
   ============================================================ */

interface FormState {
    businessName: string;
    services: string[];
    days: number[]; // 0 = Sunday ... 6 = Saturday
    start: string;
    end: string;
    slotDurationMinutes: number;
    timezone: string;
    voice: string;
    customInstructions: string;
}

type Errors = Partial<Record<keyof FormState | "form", string>>;

interface CreateBusinessResponse {
    success: boolean;
    id: number;
}

/** 1 = business details, 2 = connect calendar, 3 = finished */
type Step = 1 | 2 | 3;

interface Props {
    /** Step 1 save hone ke baad */
    onCreated?: (id: number) => void;
    /** Step 2 finish / skip ke baad */
    onFinished?: (id: number) => void;
}

/* ============================================================
   Constants
   ============================================================ */

const DAYS = [
    { n: 1, label: "Mon" },
    { n: 2, label: "Tue" },
    { n: 3, label: "Wed" },
    { n: 4, label: "Thu" },
    { n: 5, label: "Fri" },
    { n: 6, label: "Sat" },
    { n: 0, label: "Sun" },
];

const SLOT_OPTIONS = [15, 30, 45, 60];
const VOICES = ["Kore", "Puck", "Charon", "Fenrir", "Aoede"];
const FALLBACK_TIMEZONES = [
    "Asia/Kolkata",
    "Asia/Dubai",
    "Asia/Singapore",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "Australia/Sydney",
    "UTC",
];

const MAX_SERVICE_LENGTH = 60;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WHATSAPP_PHONE_ID_PATTERN = /^\d{8,20}$/;

/* ============================================================
   Helpers
   ============================================================ */

const getTimezones = (): string[] => {
    try {
        const intlWithTimezones = Intl as typeof Intl & {
            supportedValuesOf?: (key: "timeZone") => string[];
        };
        const timezones = intlWithTimezones.supportedValuesOf?.("timeZone");
        return timezones?.length ? timezones : FALLBACK_TIMEZONES;
    } catch {
        return FALLBACK_TIMEZONES;
    }
};

const TIMEZONES = getTimezones();

const detectTimezone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
        return "Asia/Kolkata";
    }
};

const createInitialForm = (): FormState => ({
    businessName: "",
    services: [],
    days: [1, 2, 3, 4, 5, 6],
    start: "09:00",
    end: "18:00",
    slotDurationMinutes: 30,
    timezone: detectTimezone(),
    voice: "Kore",
    customInstructions: "",
});

// Time input khali ya adhura ho to NaN ki jagah null milta hai
const toMinutes = (time: string): number | null => {
    const match = TIME_PATTERN.exec(time);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

// Server (zod) ke field names -> form ke field names
const fieldMap: Partial<Record<string, keyof FormState>> = {
    businessName: "businessName",
    services: "services",
    days: "days",
    start: "start",
    end: "end",
    slotDurationMinutes: "slotDurationMinutes",
    timezone: "timezone",
    voice: "voice",
    customInstructions: "customInstructions",
    workingHours: "end",
};

const collectServices = (services: string[], draft: string): string[] => {
    const seen = new Set<string>();
    return [...services, draft]
        .map((service) => service.trim())
        .filter((service) => {
            const normalized = service.toLowerCase();
            if (!service || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
};

const describeError = (
    error: unknown,
    fallback = "Something went wrong. Please try again.",
): string => {
    if (!axios.isAxiosError(error)) return fallback;
    if (!error.response) {
        return "Could not connect to the server. Please check your internet connection.";
    }
    const status = error.response.status;
    if (status === 401) return "Please sign in before saving your business details.";
    if (status === 429) return "Too many requests. Please try again in a moment.";
    const body: unknown = error.response.data;
    if (isRecord(body) && typeof body.message === "string") return body.message;
    return fallback;
};

const inputClass =
    "w-full rounded-2xl border border-brand-border bg-brand-surface px-4 py-3.5 text-brand-text-h outline-none transition duration-200 placeholder:text-brand-muted/70 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/10 motion-reduce:transition-none";
const labelClass = "mb-2 block text-sm font-bold text-brand-text-h";
const errorClass = "mt-2 text-sm font-medium text-red-600 dark:text-red-400";
const cardClass =
    "rounded-[1.75rem] border border-brand-border/80 bg-brand-surface p-5 shadow-brand-card sm:p-8";
const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-primary px-5 py-3.5 font-bold text-brand-on-primary shadow-lg shadow-orange-900/15 transition duration-200 hover:-translate-y-0.5 hover:bg-brand-primary-hover hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none";
const secondaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-border bg-brand-surface px-5 py-3.5 font-bold text-brand-text-h transition duration-200 hover:border-brand-primary/60 hover:bg-brand-bg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/15 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none";

/* ============================================================
   Step indicator
   ============================================================ */

const STEP_ITEMS = [
    { id: 1, label: "Business details" },
    { id: 2, label: "Connect calendar" },
];

function StepIndicator({ step }: { step: Step }) {
    return (
        <ol className="ml-auto flex items-center gap-2 text-xs font-semibold" aria-label="Setup progress">
            {STEP_ITEMS.map((item, index) => {
                const done = step > item.id;
                const current = step === item.id;
                return (
                    <li
                        key={item.id}
                        className="flex items-center gap-2"
                        aria-current={current ? "step" : undefined}
                    >
                        <span
                            className={`flex size-7 items-center justify-center rounded-full border text-[11px] transition-colors ${done
                                ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                                : current
                                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary ring-4 ring-brand-primary/10"
                                    : "border-brand-border bg-brand-surface text-brand-muted"
                                }`}
                        >
                            {done ? <Check size={13} aria-hidden="true" /> : item.id}
                        </span>
                        <span
                            className={`${current ? "inline" : "hidden sm:inline"} ${current || done ? "text-brand-text-h" : "text-brand-muted"
                                }`}
                        >
                            {item.label}
                        </span>
                        {index < STEP_ITEMS.length - 1 && (
                            <span className={`hidden h-px w-8 sm:block ${done ? "bg-brand-primary" : "bg-brand-border"}`} aria-hidden="true" />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

/* ============================================================
   Main component
   ============================================================ */

export default function BusinessOnboarding({ onCreated, onFinished }: Props) {
    const [step, setStep] = useState<Step>(1);

    /* ---------- step 1 state ---------- */
    const [form, setForm] = useState<FormState>(createInitialForm);
    const [serviceDraft, setServiceDraft] = useState("");
    const [errors, setErrors] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);

    /* ---------- step 2 state ---------- */
    const [createdId, setCreatedId] = useState<number | null>(null);
    const [savedName, setSavedName] = useState("");
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [whatsappConnected, setWhatsappConnected] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [stepError, setStepError] = useState<string | null>(null);

    const [waPhoneId, setWaPhoneId] = useState("");
    const [waToken, setWaToken] = useState("");
    const [waSaving, setWaSaving] = useState(false);
    const [waError, setWaError] = useState<string | null>(null);

    /* ============================================================
       Step 2: status + OAuth return handling
       ============================================================ */

    const loadStatus = useCallback(async (id: number) => {
        setStatusLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/details/${id}`, {
                withCredentials: true,
            });
            const body: unknown = response.data;
            const data = isRecord(body) && isRecord(body.data) ? body.data : null;
            if (data) {
                setCalendarConnected(data.calendarConnected === true);
                setWhatsappConnected(data.whatsappConnected === true);
                if (typeof data.businessName === "string") setSavedName(data.businessName);
            }
        } catch (error: unknown) {
            setStepError(describeError(error, "Couldn't check your connection status. Refresh to try again."));
        } finally {
            setStatusLoading(false);
        }
    }, []);

    // Google OAuth se wapas aane par: ?businessId=10&calendar=connected|error
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const rawId = params.get("businessId");
        if (!rawId || !/^\d+$/.test(rawId)) return;

        const id = Number(rawId);
        const calendar = params.get("calendar");

        setCreatedId(id);
        setStep(2);
        if (calendar === "error") {
            setStepError("We couldn't connect Google Calendar. Please try again.");
        }

        params.delete("businessId");
        params.delete("calendar");
        const query = params.toString();
        window.history.replaceState(
            {},
            "",
            `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
        );

        void loadStatus(id);
    }, [loadStatus]);

    const connectCalendar = () => {
        if (createdId === null) return;
        setConnecting(true);
        setStepError(null);
        // Full-page redirect: backend Google consent page pe bhejega
        window.location.href = `${API_BASE_URL}/google/connect?businessId=${createdId}`;
    };

    const saveWhatsapp = async () => {
        if (createdId === null || waSaving) return;

        const phoneId = waPhoneId.trim();
        const token = waToken.trim();
        if (!WHATSAPP_PHONE_ID_PATTERN.test(phoneId)) {
            setWaError("Phone number ID should be 8 to 20 digits.");
            return;
        }
        if (token.length < 20) {
            setWaError("Enter the full access token from Meta.");
            return;
        }

        setWaSaving(true);
        setWaError(null);
        try {
            await axios.post(
                `${API_BASE_URL}/details/${createdId}/whatsapp`,
                { whatsappPhoneNumberId: phoneId, whatsappToken: token },
                { withCredentials: true },
            );
            setWhatsappConnected(true);
            setWaPhoneId("");
            setWaToken("");
        } catch (error: unknown) {
            setWaError(describeError(error));
        } finally {
            setWaSaving(false);
        }
    };

    const finishSetup = () => {
        if (createdId === null) return;
        setStep(3);
        window.scrollTo({ top: 0 });
        onFinished?.(createdId);
    };

    const startOver = () => {
        setForm(createInitialForm());
        setServiceDraft("");
        setErrors({});
        setCreatedId(null);
        setSavedName("");
        setCalendarConnected(false);
        setWhatsappConnected(false);
        setStepError(null);
        setWaPhoneId("");
        setWaToken("");
        setWaError(null);
        setStep(1);
        window.scrollTo({ top: 0 });
    };

    /* ============================================================
       Step 1: form logic
       ============================================================ */

    const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
    };

    const addService = (rawValue: string) => {
        const value = rawValue.trim();
        if (value) {
            setForm((current) => ({
                ...current,
                services: collectServices(current.services, value),
            }));
            setErrors((current) => ({ ...current, services: undefined, form: undefined }));
        }
        setServiceDraft("");
    };

    const handleServiceKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addService(serviceDraft);
        } else if (event.key === "Backspace" && !serviceDraft && form.services.length) {
            updateField("services", form.services.slice(0, -1));
        }
    };

    const toggleDay = (day: number) => {
        const nextDays = form.days.includes(day)
            ? form.days.filter((selectedDay) => selectedDay !== day)
            : [...form.days, day];
        updateField("days", nextDays);
    };

    // preview numbers (NaN-safe)
    const startMinutes = toMinutes(form.start);
    const endMinutes = toMinutes(form.end);
    const span = startMinutes !== null && endMinutes !== null ? endMinutes - startMinutes : 0;
    const invalidRange = startMinutes !== null && endMinutes !== null && span <= 0;
    const slotsPerDay = span > 0 ? Math.floor(span / form.slotDurationMinutes) : 0;
    const weeklySlots = slotsPerDay * form.days.length;
    const barHeight = Math.min(100, Math.max(8, (span / 1440) * 100));

    const validate = (services: string[]): Errors => {
        const found: Errors = {};
        const name = form.businessName.trim();
        if (name.length < 2) found.businessName = "Business name must be at least 2 characters.";
        if (name.length > 150) found.businessName = "Business name must be 150 characters or fewer.";
        if (!services.length) found.services = "Add at least one service.";
        if (!form.days.length) found.days = "Choose at least one working day.";
        if (startMinutes === null) found.start = "Enter a valid opening time.";
        if (endMinutes === null || (startMinutes !== null && startMinutes >= endMinutes)) {
            found.end = "Closing time must be later than opening time.";
        }
        if (!SLOT_OPTIONS.includes(form.slotDurationMinutes)) {
            found.slotDurationMinutes = "Choose a valid appointment length.";
        }
        if (!VOICES.includes(form.voice)) found.voice = "Choose a valid receptionist voice.";
        try {
            Intl.DateTimeFormat(undefined, { timeZone: form.timezone });
        } catch {
            found.timezone = "Choose a valid timezone.";
        }
        if (form.customInstructions.length > 2000) {
            found.customInstructions = "Instructions must be 2000 characters or fewer.";
        }
        return found;
    };

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting) return;

        const services = collectServices(form.services, serviceDraft);
        const validationErrors = validate(services);
        if (serviceDraft) {
            setForm((current) => ({ ...current, services }));
            setServiceDraft("");
        }
        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            return;
        }

        setSubmitting(true);
        setErrors({});

        const payload = {
            businessName: form.businessName.trim(),
            services,
            workingHours: {
                days: [...form.days].sort((a, b) => a - b),
                start: form.start,
                end: form.end,
            },
            slotDurationMinutes: form.slotDurationMinutes,
            timezone: form.timezone,
            voice: form.voice,
            customInstructions: form.customInstructions.trim() || null,
        };

        try {
            const response = await axios.post<CreateBusinessResponse>(`${API_BASE_URL}/details/`, payload, {
                withCredentials: true,
            });
            const { id, success } = response.data;
            if (success !== true || !Number.isSafeInteger(id) || id <= 0) {
                setErrors({ form: "Business was saved, but the server returned an invalid response." });
                return;
            }

            setCreatedId(id);
            setSavedName(payload.businessName);
            setCalendarConnected(false);
            setWhatsappConnected(false);
            setStepError(null);
            setStep(2);
            window.scrollTo({ top: 0 });
            onCreated?.(id);
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.status === 400) {
                const errorBody: unknown = error.response.data;
                const data = isRecord(errorBody) ? errorBody : {};
                if (isRecord(data.errors)) {
                    const mapped: Errors = {};
                    for (const [key, messages] of Object.entries(data.errors)) {
                        const field =
                            fieldMap[key] ?? (key.startsWith("workingHours.") ? "end" : undefined);
                        const message = Array.isArray(messages) ? messages[0] : messages;
                        if (field && typeof message === "string") mapped[field] = message;
                    }
                    setErrors(
                        Object.keys(mapped).length
                            ? mapped
                            : { form: "Please check the details and try again." },
                    );
                    return;
                }
            }
            setErrors({ form: describeError(error) });
        } finally {
            setSubmitting(false);
        }
    };

    /* ============================================================
       Render
       ============================================================ */

    return (
        <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_34%),linear-gradient(135deg,var(--bg),color-mix(in_srgb,var(--accent)_10%,var(--bg)))] px-4 py-6 text-brand-text sm:px-6 sm:py-10">
            <div className="mx-auto max-w-6xl">
                <header className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-border/70 bg-brand-surface/80 px-4 py-3 shadow-sm backdrop-blur sm:mb-10 sm:px-5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-brand-primary text-brand-on-primary shadow-md shadow-orange-900/15">
                        <Building2 size={22} aria-hidden="true" />
                    </div>
                    <div>
                        <p className="text-sm font-extrabold tracking-wide text-brand-text-h">AI Receptionist</p>
                        <p className="text-xs text-brand-muted">Business onboarding</p>
                    </div>
                    <StepIndicator step={step} />
                </header>

                {/* ======================= STEP 1 ======================= */}
                {step === 1 && (
                    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)] lg:gap-7">
                        <form className={cardClass} onSubmit={onSubmit} noValidate aria-busy={submitting}>
                            <div className="mb-7 border-b border-brand-border/70 pb-6 sm:mb-8 sm:pb-7">
                                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-primary/15 bg-brand-primary/8 px-3 py-1 text-xs font-bold text-brand-primary">
                                    <Sparkles size={14} aria-hidden="true" />
                                    Personalize your receptionist
                                </div>
                                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">Step 1 of 2 · Business profile</p>
                                <h1 className="text-3xl font-extrabold tracking-tight text-brand-text-h sm:text-[2.5rem]">
                                    Tell us about your business
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted sm:text-base">
                                    Share your services and availability so your receptionist can answer
                                    callers confidently and book the right appointments.
                                </p>
                            </div>

                            {errors.form && (
                                <div
                                    className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                                    role="alert"
                                >
                                    {errors.form}
                                </div>
                            )}

                            {/* business name */}
                            <div className="mb-6">
                                <label className={labelClass} htmlFor="businessName">
                                    Business name
                                </label>
                                <input
                                    className={inputClass}
                                    id="businessName"
                                    type="text"
                                    value={form.businessName}
                                    onChange={(event) => updateField("businessName", event.target.value)}
                                    placeholder="e.g. City Dental Clinic"
                                    maxLength={150}
                                    aria-invalid={!!errors.businessName}
                                    aria-describedby={errors.businessName ? "err-businessName" : undefined}
                                />
                                {errors.businessName && (
                                    <p className={errorClass} id="err-businessName">{errors.businessName}</p>
                                )}
                            </div>

                            {/* services */}
                            <div className="mb-7">
                                <label className={labelClass} htmlFor="services">
                                    Services
                                </label>
                                <div
                                    className={`flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border bg-brand-surface p-2 transition focus-within:border-brand-primary focus-within:ring-4 focus-within:ring-brand-primary/10 ${errors.services ? "border-red-500" : "border-brand-border"
                                        }`}
                                >
                                    {form.services.map((service) => (
                                        <span
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-primary/10 bg-brand-primary/10 px-3 py-1.5 text-sm font-semibold text-brand-text-h"
                                            key={service}
                                        >
                                            {service}
                                            <button
                                                type="button"
                                                className="rounded-full p-0.5 transition hover:bg-brand-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                                aria-label={`Remove ${service}`}
                                                onClick={() =>
                                                    updateField(
                                                        "services",
                                                        form.services.filter((item) => item !== service),
                                                    )
                                                }
                                            >
                                                <X size={14} aria-hidden="true" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        className="min-w-32 flex-1 bg-transparent px-2 py-2 text-sm text-brand-text-h outline-none placeholder:text-brand-muted/70 focus-visible:outline-none"
                                        id="services"
                                        type="text"
                                        value={serviceDraft}
                                        onChange={(event) => setServiceDraft(event.target.value)}
                                        onKeyDown={handleServiceKeyDown}
                                        onBlur={() => addService(serviceDraft)}
                                        placeholder={form.services.length ? "Add another…" : "Checkup, cleaning…"}
                                        maxLength={MAX_SERVICE_LENGTH}
                                        aria-invalid={!!errors.services}
                                        aria-describedby={errors.services ? "err-services" : "hint-services"}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-brand-muted" id="hint-services">
                                    Press Enter or comma after each service.
                                </p>
                                {errors.services && (
                                    <p className={errorClass} id="err-services">{errors.services}</p>
                                )}
                            </div>

                            {/* working hours */}
                            <fieldset className="mb-7 rounded-2xl border border-brand-border bg-brand-bg/30 p-4 sm:p-5">
                                <legend className="px-2 text-base font-extrabold text-brand-text-h">
                                    <span className="mr-2 inline-flex align-middle text-brand-primary">
                                        <CalendarDays size={18} aria-hidden="true" />
                                    </span>
                                    Working hours
                                </legend>
                                <div
                                    className="mb-5 flex flex-wrap gap-2"
                                    role="group"
                                    aria-label="Working days"
                                    aria-describedby={errors.days ? "err-days" : undefined}
                                >
                                    {DAYS.map(({ n, label }) => {
                                        const selected = form.days.includes(n);
                                        return (
                                            <button
                                                key={n}
                                                type="button"
                                                className={`min-w-12 rounded-xl border px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/15 ${selected
                                                    ? "border-brand-primary bg-brand-primary text-brand-on-primary shadow-sm"
                                                    : "border-brand-border bg-brand-surface text-brand-muted hover:border-brand-primary/50 hover:text-brand-text-h"
                                                    }`}
                                                aria-pressed={selected}
                                                onClick={() => toggleDay(n)}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.days && (
                                    <p className={`${errorClass} mb-4`} id="err-days">{errors.days}</p>
                                )}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className={labelClass} htmlFor="start">Opens</label>
                                        <input
                                            className={inputClass}
                                            id="start"
                                            type="time"
                                            value={form.start}
                                            onChange={(event) => updateField("start", event.target.value)}
                                            aria-invalid={!!errors.start}
                                            aria-describedby={errors.start ? "err-start" : undefined}
                                        />
                                        {errors.start && <p className={errorClass} id="err-start">{errors.start}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="end">Closes</label>
                                        <input
                                            className={inputClass}
                                            id="end"
                                            type="time"
                                            value={form.end}
                                            onChange={(event) => updateField("end", event.target.value)}
                                            aria-invalid={!!errors.end}
                                            aria-describedby={errors.end ? "err-end" : undefined}
                                        />
                                        {errors.end && <p className={errorClass} id="err-end">{errors.end}</p>}
                                    </div>
                                </div>
                            </fieldset>

                            {/* slot + voice */}
                            <div className="mb-6 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass} htmlFor="slot">
                                        <Clock3 className="mr-1.5 inline" size={16} aria-hidden="true" />
                                        Appointment length
                                    </label>
                                    <select
                                        className={inputClass}
                                        id="slot"
                                        value={form.slotDurationMinutes}
                                        onChange={(event) =>
                                            updateField("slotDurationMinutes", Number(event.target.value))
                                        }
                                        aria-invalid={!!errors.slotDurationMinutes}
                                        aria-describedby={errors.slotDurationMinutes ? "err-slot" : undefined}
                                    >
                                        {SLOT_OPTIONS.map((minutes) => (
                                            <option key={minutes} value={minutes}>{minutes} minutes</option>
                                        ))}
                                    </select>
                                    {errors.slotDurationMinutes && (
                                        <p className={errorClass} id="err-slot">{errors.slotDurationMinutes}</p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="voice">
                                        <Mic2 className="mr-1.5 inline" size={16} aria-hidden="true" />
                                        Receptionist voice
                                    </label>
                                    <select
                                        className={inputClass}
                                        id="voice"
                                        value={form.voice}
                                        onChange={(event) => updateField("voice", event.target.value)}
                                        aria-invalid={!!errors.voice}
                                        aria-describedby={errors.voice ? "err-voice" : undefined}
                                    >
                                        {VOICES.map((voice) => (
                                            <option key={voice} value={voice}>{voice}</option>
                                        ))}
                                    </select>
                                    {errors.voice && <p className={errorClass} id="err-voice">{errors.voice}</p>}
                                </div>
                            </div>

                            {/* timezone */}
                            <div className="mb-6">
                                <label className={labelClass} htmlFor="timezone">
                                    <Globe2 className="mr-1.5 inline" size={16} aria-hidden="true" />
                                    Timezone
                                </label>
                                <select
                                    className={inputClass}
                                    id="timezone"
                                    value={form.timezone}
                                    onChange={(event) => updateField("timezone", event.target.value)}
                                    aria-invalid={!!errors.timezone}
                                    aria-describedby={errors.timezone ? "err-timezone" : undefined}
                                >
                                    {(TIMEZONES.includes(form.timezone)
                                        ? TIMEZONES
                                        : [form.timezone, ...TIMEZONES]
                                    ).map((timezone) => (
                                        <option key={timezone} value={timezone}>{timezone}</option>
                                    ))}
                                </select>
                                {errors.timezone && (
                                    <p className={errorClass} id="err-timezone">{errors.timezone}</p>
                                )}
                            </div>

                            {/* custom instructions */}
                            <div className="mb-8">
                                <div className="mb-2 flex items-center justify-between gap-4">
                                    <label className="text-sm font-semibold text-brand-text-h" htmlFor="instructions">
                                        Extra instructions
                                        <span className="ml-2 font-normal text-brand-muted">Optional</span>
                                    </label>
                                    <span className="text-xs tabular-nums text-brand-muted">
                                        {form.customInstructions.length}/2000
                                    </span>
                                </div>
                                <textarea
                                    className={`${inputClass} min-h-28 resize-y`}
                                    id="instructions"
                                    rows={4}
                                    value={form.customInstructions}
                                    onChange={(event) => updateField("customInstructions", event.target.value)}
                                    placeholder="e.g. Free parking available. Call the clinic for emergencies."
                                    maxLength={2000}
                                    aria-invalid={!!errors.customInstructions}
                                />
                                {errors.customInstructions && (
                                    <p className={errorClass}>{errors.customInstructions}</p>
                                )}
                            </div>

                            <button type="submit" className={`${primaryButtonClass} w-full`} disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <LoaderCircle className="animate-spin motion-reduce:animate-none" size={18} aria-hidden="true" />
                                        Saving your business…
                                    </>
                                ) : "Save and continue"}
                                {!submitting && <ArrowRight size={18} aria-hidden="true" />}
                            </button>
                        </form>

                        {/* live preview */}
                        <aside
                            className="rounded-[1.75rem] border border-brand-border/80 bg-brand-surface p-5 shadow-brand-card sm:p-7 lg:sticky lg:top-8"
                            aria-label="Schedule preview"
                        >
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-primary">
                                        <Sparkles size={12} aria-hidden="true" />
                                        Live preview
                                    </p>
                                    <h2 className="max-w-64 wrap-break-words text-xl font-extrabold leading-tight text-brand-text-h">
                                        {form.businessName.trim() || "Your business"}
                                    </h2>
                                </div>
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                                    <CalendarDays size={21} aria-hidden="true" />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-brand-border/70 bg-brand-bg/70 p-4">
                                <div className="mb-3 flex items-center justify-between text-xs font-semibold text-brand-muted">
                                    <span>Weekly availability</span>
                                    <span>{form.days.length} {form.days.length === 1 ? "day" : "days"}</span>
                                </div>
                                <div className="grid h-36 grid-cols-7 grid-rows-1 gap-2" aria-hidden="true">
                                    {DAYS.map(({ n, label }) => {
                                        const selected = form.days.includes(n);
                                        return (
                                            <div className="flex min-h-0 flex-col items-center gap-2" key={n}>
                                                <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                                                    <div
                                                        className={`w-full max-w-7 rounded-t-lg transition-all ${selected
                                                            ? "bg-linear-to-t from-brand-primary to-amber-300"
                                                            : "h-1 bg-brand-border"
                                                            }`}
                                                        style={selected ? { height: `${barHeight}%` } : undefined}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-semibold text-brand-muted">{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <dl className="my-5 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-brand-border bg-brand-bg/30 p-4">
                                    <dt className="text-xs font-medium text-brand-muted">Slots per day</dt>
                                    <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-text-h">
                                        {slotsPerDay}
                                    </dd>
                                </div>
                                <div className="rounded-2xl border border-brand-border bg-brand-bg/30 p-4">
                                    <dt className="text-xs font-medium text-brand-muted">Slots per week</dt>
                                    <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-text-h">
                                        {weeklySlots}
                                    </dd>
                                </div>
                            </dl>

                            <div className="rounded-2xl border border-brand-accent-border bg-brand-accent-bg p-4">
                                <p className="flex items-center gap-2 text-sm font-bold text-brand-text-h">
                                    <Clock3 size={16} aria-hidden="true" />
                                    Your schedule
                                </p>
                                <p className="mt-1 text-sm leading-6 text-brand-text">
                                    {!form.days.length
                                        ? "Choose a working day to build your schedule."
                                        : invalidRange
                                            ? "Closing time must be later than opening time."
                                            : span > 0
                                                ? `${form.start}–${form.end}, ${form.slotDurationMinutes}-minute appointments`
                                                : "Enter your opening and closing times."}
                                </p>
                                <p className="mt-2 text-xs text-brand-muted">{form.timezone}</p>
                            </div>
                        </aside>
                    </div>
                )}

                {/* ======================= STEP 2 ======================= */}
                {step === 2 && (
                    <section className={`${cardClass} mx-auto max-w-2xl`} aria-labelledby="step2-title" aria-busy={statusLoading}>
                        <div className="mb-8 border-b border-brand-border/70 pb-7">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 dark:bg-green-900/30 dark:text-green-200">
                                <Check size={14} aria-hidden="true" />
                                {savedName ? `${savedName} saved` : "Business saved"}
                            </div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">Step 2 of 2 · Connect your tools</p>
                            <h1
                                id="step2-title"
                                className="text-3xl font-extrabold tracking-tight text-brand-text-h sm:text-[2.5rem]"
                            >
                                Connect your calendar
                            </h1>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-brand-muted sm:text-base">
                                Link the tools your receptionist needs to schedule visits and send confirmations.
                            </p>
                        </div>

                        {statusLoading && (
                            <p className="mb-5 flex items-center gap-2 rounded-2xl bg-brand-bg/70 px-4 py-3 text-sm font-medium text-brand-muted" role="status">
                                <LoaderCircle className="animate-spin motion-reduce:animate-none" size={16} aria-hidden="true" />
                                Checking your connection status…
                            </p>
                        )}

                        {stepError && (
                            <div
                                className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                                role="alert"
                            >
                                {stepError}
                            </div>
                        )}

                        {/* Google Calendar */}
                        <div className={`mb-5 rounded-2xl border p-5 transition-colors ${calendarConnected ? "border-green-300 bg-green-50/50 dark:border-green-900 dark:bg-green-950/15" : "border-brand-border bg-brand-bg/20"}`}>
                            <div className="flex items-start gap-4">
                                <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${calendarConnected ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-brand-primary/10 text-brand-primary"}`}>
                                    <CalendarDays size={21} aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-bold text-brand-text-h">Google Calendar</h2>
                                        {calendarConnected && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800 dark:bg-green-900/40 dark:text-green-200">
                                                <Check size={12} aria-hidden="true" /> Connected
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-brand-muted">
                                        {calendarConnected
                                            ? "Your calendar is linked. New appointments will appear there."
                                            : "You’ll sign in with Google and allow access to the calendar you want to use for bookings."}
                                    </p>
                                </div>
                            </div>
                            {!calendarConnected && (
                                <button
                                    type="button"
                                    className={`${primaryButtonClass} mt-5 w-full sm:w-auto`}
                                    onClick={connectCalendar}
                                    disabled={connecting || statusLoading || createdId === null}
                                >
                                    {connecting ? (
                                        <>
                                            <LoaderCircle className="animate-spin motion-reduce:animate-none" size={18} aria-hidden="true" />
                                            Redirecting to Google…
                                        </>
                                    ) : "Connect Google Calendar"}
                                    {!connecting && <ArrowRight size={18} aria-hidden="true" />}
                                </button>
                            )}
                        </div>

                        {/* WhatsApp (optional) */}
                        <div className="mb-8 rounded-2xl border border-brand-border bg-brand-bg/20 p-5">
                            <div className="flex items-start gap-4">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                                    <MessageCircle size={21} aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-bold text-brand-text-h">WhatsApp</h2>
                                        <span className="text-sm text-brand-muted">Optional</span>
                                        {whatsappConnected && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800 dark:bg-green-900/40 dark:text-green-200">
                                                <Check size={12} aria-hidden="true" /> Connected
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-brand-muted">
                                        {whatsappConnected
                                            ? "Appointment confirmations will be sent on WhatsApp."
                                            : "Send appointment confirmations on WhatsApp. You can add this later."}
                                    </p>
                                </div>
                            </div>

                            {!whatsappConnected && (
                                <div className="mt-5 grid gap-4">
                                    <div>
                                        <label className={labelClass} htmlFor="waPhoneId">
                                            Phone number ID
                                        </label>
                                        <input
                                            className={inputClass}
                                            id="waPhoneId"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            value={waPhoneId}
                                            onChange={(event) => {
                                                setWaPhoneId(event.target.value);
                                                setWaError(null);
                                            }}
                                            placeholder="From Meta WhatsApp Manager"
                                            maxLength={20}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="waToken">
                                            Access token
                                        </label>
                                        <input
                                            className={inputClass}
                                            id="waToken"
                                            type="password"
                                            autoComplete="off"
                                            spellCheck={false}
                                            value={waToken}
                                            onChange={(event) => {
                                                setWaToken(event.target.value);
                                                setWaError(null);
                                            }}
                                            placeholder="Paste your permanent token"
                                            aria-describedby={waError ? "err-wa" : "hint-wa"}
                                            aria-invalid={!!waError}
                                        />
                                        <p className="mt-2 text-xs text-brand-muted" id="hint-wa">
                                            The token is stored encrypted and never shown again.
                                        </p>
                                        {waError && <p className={errorClass} id="err-wa">{waError}</p>}
                                    </div>
                                    <button
                                        type="button"
                                        className={`${secondaryButtonClass} w-full sm:w-auto sm:justify-self-start`}
                                        onClick={saveWhatsapp}
                                        disabled={waSaving || !waPhoneId.trim() || !waToken.trim()}
                                    >
                                        {waSaving ? "Saving…" : "Save WhatsApp"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* footer */}
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-brand-muted">
                                {calendarConnected
                                    ? "You’re ready to finish."
                                    : "You can finish now and connect the calendar later, but booking stays off until then."}
                            </p>
                            <button
                                type="button"
                                className={calendarConnected ? primaryButtonClass : secondaryButtonClass}
                                onClick={finishSetup}
                                disabled={statusLoading || connecting}
                            >
                                {statusLoading ? "Checking status…" : calendarConnected ? "Finish setup" : "Skip for now"}
                                {!statusLoading && <ArrowRight size={18} aria-hidden="true" />}
                            </button>
                        </div>
                    </section>
                )}

                {/* ======================= DONE ======================= */}
                {step === 3 && (
                    <section
                        className={`${cardClass} mx-auto max-w-xl text-center sm:p-12`}
                        role="status"
                    >
                        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-[1.4rem] bg-green-100 text-green-700 ring-8 ring-green-50 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-950/30">
                            <Check size={32} aria-hidden="true" />
                        </div>
                        <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-brand-primary">
                            You’re all set
                        </p>
                        <h1 className="text-3xl font-extrabold tracking-tight text-brand-text-h">
                            {savedName || "Your business"} is {calendarConnected ? "ready" : "saved"}
                        </h1>
                        <p className="mx-auto mt-4 max-w-md leading-7 text-brand-text">
                            {calendarConnected
                                ? "Your receptionist can now book appointments. An admin will assign your phone number."
                                : "Connect Google Calendar later to turn on booking. An admin will assign your phone number."}
                        </p>
                        <button type="button" className={`${primaryButtonClass} mt-8`} onClick={startOver}>
                            Add another business <ArrowRight size={18} aria-hidden="true" />
                        </button>
                    </section>
                )}
            </div>
        </main>
    );
}