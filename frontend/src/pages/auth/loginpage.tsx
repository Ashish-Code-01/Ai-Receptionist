import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

type Credentials = { email: string; password: string; remember: boolean };

type LoginProps = {
    /** Apna login logic yahan pass karo. Default: POST /api/auth/login (Node backend). */
    onSubmit?: (data: Credentials) => Promise<void>;
    onForgotPassword?: () => void;
    productName?: string;
};

async function defaultSubmit(data: Credentials) {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Email or password is incorrect.");
    }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BARS = Array.from({ length: 30 }, (_, i) => i);

// Demo call: `at` = second (in a 14s loop) when the line appears
const CHAT = [
    { from: "caller", at: 1, text: "Hi, can I move my Thursday appointment?" },
    { from: "ai", at: 3, text: "Of course. I have Friday at 10:30 or Monday at 9:00." },
    { from: "caller", at: 6, text: "Friday works." },
    { from: "ai", at: 8, text: "Done. You're booked, and I've texted you a confirmation." },
];

const icon = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const MailIcon = () => (<svg {...icon} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>);
const LockIcon = () => (<svg {...icon} aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>);
const PhoneIcon = () => (<svg {...icon} aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>);
const CheckIcon = () => (<svg {...icon} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>);

export default function Login({
    onSubmit = defaultSubmit,
    onForgotPassword,
    productName = "Receptionist",
}: LoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);

    const [sec, setSec] = useState(0);
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setSec(11);
            return;
        }
        const id = setInterval(() => setSec((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, []);
    const phase = sec % 14;

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFormError("");

        const next: typeof errors = {};
        if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
        if (!password) next.password = "Enter your password.";
        setErrors(next);
        if (Object.keys(next).length) return;
        // TODO: Add recaptcha here if needed

        setLoading(true);
        try {
            await onSubmit({ email: email.trim(), password, remember });
            window.location.assign("/dashboard"); // apna route daal lena
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Could not sign in. Try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="grid min-h-screen grid-cols-[minmax(0,5fr)_minmax(0,6fr)] bg-brand-bg font-[family-name:var(--sans)] text-brand-text max-[800px]:grid-cols-1">
            <aside
                className="relative flex flex-col justify-between gap-[2rem] overflow-hidden bg-brand-primary p-[2.5rem] text-brand-on-primary before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-radial-gradient(circle_at_88%_14%,transparent_0_54px,color-mix(in_srgb,var(--on-primary)_11%,transparent)_54px_56px)] [&>*]:relative max-[800px]:gap-[1rem] max-[800px]:px-[1.5rem] max-[800px]:pt-[1.25rem] max-[800px]:pb-[1.5rem] max-[800px]:before:hidden"
                aria-hidden="true"
            >
                <div className="flex items-center gap-[.65rem] font-[family-name:var(--heading)] text-[1.15rem] font-bold">
                    <span className="grid size-[2.25rem] place-items-center rounded-[10px] bg-brand-on-primary text-brand-primary"><PhoneIcon /></span>
                    {productName}
                </div>

                <div className="box-border w-full max-w-[25rem] rounded-[20px] bg-brand-surface p-[1.25rem] text-brand-text shadow-brand-card max-[800px]:hidden">
                    <div className="flex items-center justify-between text-[.85rem]">
                        <span className="inline-flex items-center gap-[.45rem] rounded-full bg-[color-mix(in_srgb,var(--secondary)_16%,transparent)] px-[.65rem] py-[.25rem] font-semibold text-brand-text-h">
                            <i className="size-[.5rem] animate-login-blink rounded-full bg-brand-secondary motion-reduce:animate-none" /> Live call
                        </span>
                        <span className="tabular-nums text-brand-muted">0:{String(14 + phase).padStart(2, "0")}</span>
                    </div>

                    <div className="my-[1rem] mb-[.75rem] flex items-center gap-[.75rem]">
                        <span className="grid size-[2.5rem] place-items-center rounded-full bg-brand-accent text-[.9rem] font-bold text-[#2B2118]">PS</span>
                        <div>
                            <b className="block text-brand-text-h">Priya Sharma</b>
                            <small className="text-brand-muted">+91 98•••• ••21</small>
                        </div>
                    </div>

                    <div className="mb-[.9rem] flex h-[44px] items-center justify-between">
                        {BARS.map((i) => (
                            <span
                                key={i}
                                className="h-full w-[5px] origin-center animate-login-talk rounded-[3px] bg-brand-primary [animation-delay:calc(var(--i)*-80ms)] motion-reduce:animate-none"
                                style={{ "--i": i, "--h": 0.3 + ((i * 37) % 10) / 14 } as CSSProperties}
                            />
                        ))}
                    </div>

                    <ol className="m-0 grid list-none gap-[.5rem] p-0 text-[.95rem] leading-[1.4]">
                        {CHAT.map((m) => (
                            <li
                                key={m.at}
                                className={`max-w-[85%] rounded-[14px] px-[.85rem] py-[.6rem] opacity-0 [transform:translateY(6px)] transition-[opacity,transform] duration-[350ms] motion-reduce:transition-none ${phase >= m.at ? "opacity-100 [transform:translateY(0)]" : ""} ${m.from === "caller" ? "justify-self-start rounded-bl-[4px] bg-brand-code-bg text-brand-text-h" : "justify-self-end rounded-br-[4px] bg-brand-primary text-brand-on-primary"}`}
                            >
                                {m.text}
                            </li>
                        ))}
                    </ol>

                    <p className={`mt-[.9rem] flex items-center gap-[.5rem] rounded-[12px] bg-[color-mix(in_srgb,var(--secondary)_16%,transparent)] px-[.85rem] py-[.6rem] text-[.92rem] font-semibold text-brand-text-h opacity-0 [transform:scale(.96)] transition-[opacity,transform] duration-[350ms] motion-reduce:transition-none ${phase >= 10 ? "opacity-100 [transform:scale(1)]" : ""}`}>
                        <span className="text-brand-secondary"><CheckIcon /></span>
                        Booked for Friday, 10:30
                    </p>
                </div>

                <h2 className="m-0 max-w-[16ch] font-[family-name:var(--heading)] text-[clamp(1.7rem,2.8vw,2.4rem)] leading-[1.1] tracking-[-.02em] max-[800px]:max-w-none max-[800px]:text-[1.35rem]">Every call answered. Every booking kept.</h2>
            </aside>

            <section className="grid place-items-center bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[length:22px_22px] px-[1.25rem] py-[2rem]">
                <form className="box-border grid w-full max-w-[26rem] gap-[1.1rem] rounded-[20px] border border-brand-border bg-brand-surface p-[2.25rem] shadow-brand max-[800px]:p-[1.5rem]" onSubmit={handleSubmit} noValidate>
                    <h1 className="m-0 font-[family-name:var(--heading)] text-[2rem] leading-[1.1] tracking-[-.02em] text-brand-text-h">Welcome back</h1>
                    <p className="mt-[-.5rem] mb-[.25rem] leading-[1.5] text-brand-muted">Sign in to {productName} to see today's calls and bookings.</p>

                    <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border border-brand-border bg-brand-surface px-4 py-3 font-[inherit] text-sm font-semibold text-brand-text-h transition-colors hover:bg-brand-bg focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
                    >
                        <span className="font-bold text-[#4285F4]" aria-hidden="true">G</span>
                        Continue with Google
                    </button>
                    <div className="flex items-center gap-3 text-xs text-brand-muted" aria-hidden="true">
                        <span className="h-px flex-1 bg-brand-border" />
                        or continue with email
                        <span className="h-px flex-1 bg-brand-border" />
                    </div>

                    {formError && (
                        <p className="m-0 rounded-[10px] border border-brand-danger bg-[color-mix(in_srgb,var(--danger,#C92A2A)_8%,transparent)] px-[.85rem] py-[.7rem] text-[.92rem] text-brand-danger" role="alert">
                            {formError}
                        </p>
                    )}

                    <div className="grid gap-[.4rem]">
                        <label className="text-[.9rem] font-semibold text-brand-text-h" htmlFor="email">Email</label>
                        <div className="group relative">
                            <span className="pointer-events-none absolute top-1/2 left-[.85rem] -translate-y-1/2 text-brand-muted group-focus-within:text-brand-primary"><MailIcon /></span>
                            <input
                                id="email"
                                type="email"
                                className="box-border w-full rounded-[10px] border border-brand-border bg-brand-bg py-[.8rem] pr-[.85rem] pl-[2.6rem] font-[inherit] text-brand-text-h transition-[border-color,box-shadow] duration-150 placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_18%,transparent)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 aria-[invalid=true]:border-brand-danger motion-reduce:transition-none"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? "email-err" : undefined}
                                placeholder="you@business.com"
                            />
                        </div>
                        {errors.email && <span id="email-err" className="text-[.85rem] text-brand-danger">{errors.email}</span>}
                    </div>

                    <div className="grid gap-[.4rem]">
                        <label className="text-[.9rem] font-semibold text-brand-text-h" htmlFor="password">Password</label>
                        <div className="group relative">
                            <span className="pointer-events-none absolute top-1/2 left-[.85rem] -translate-y-1/2 text-brand-muted group-focus-within:text-brand-primary"><LockIcon /></span>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className="box-border w-full rounded-[10px] border border-brand-border bg-brand-bg py-[.8rem] pr-[4.2rem] pl-[2.6rem] font-[inherit] text-brand-text-h transition-[border-color,box-shadow] duration-150 placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_18%,transparent)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 aria-[invalid=true]:border-brand-danger motion-reduce:transition-none"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                aria-invalid={!!errors.password}
                                aria-describedby={errors.password ? "password-err" : undefined}
                            />
                            <button
                                type="button"
                                className="absolute top-1/2 right-[.4rem] -translate-y-1/2 rounded-[6px] border-0 bg-transparent px-[.55rem] py-[.35rem] font-[inherit] text-[.85rem] text-brand-muted hover:text-brand-text-h focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
                                onClick={() => setShowPassword((s) => !s)}
                                aria-pressed={showPassword}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        {errors.password && <span id="password-err" className="text-[.85rem] text-brand-danger">{errors.password}</span>}
                    </div>

                    <div className="flex items-center justify-between gap-[1rem] text-[.9rem]">
                        <label className="flex cursor-pointer items-center gap-[.5rem]">
                            <input className="accent-brand-primary" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                            Keep me signed in
                        </label>
                        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-brand-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2" onClick={onForgotPassword}>
                            Forgot password?
                        </button>
                    </div>

                    <button type="submit" className="flex cursor-pointer items-center justify-center gap-[.6rem] rounded-[10px] border-0 bg-brand-primary px-[1rem] py-[.9rem] font-[inherit] font-semibold text-brand-on-primary shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-[background,transform] duration-150 enabled:hover:[transform:translateY(-1px)] enabled:hover:bg-brand-primary-hover disabled:cursor-progress disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 motion-reduce:transition-none" disabled={loading}>
                        {loading && <span className="size-[1em] animate-login-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" />}
                        {loading ? "Signing in..." : "Sign in"}
                    </button>

                    <p className="m-0 text-center text-[.92rem] text-brand-muted">
                        New here? <a className="font-semibold text-brand-primary-hover no-underline hover:underline focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2" href="/signup">Create an account</a>
                    </p>
                </form>
            </section>
        </main>
    );
}