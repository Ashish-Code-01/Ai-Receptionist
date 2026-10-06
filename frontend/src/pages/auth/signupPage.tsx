import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

type SignupData = {
    full_name: string;
    email: string;
    phone: string;
    pass: string;
};

type SignupProps = {
    onSubmit?: (data: SignupData) => Promise<void>;
    productName?: string;
};

type FieldErrors = Partial<Record<keyof SignupData | "confirmPassword", string>>;

async function defaultSubmit(data: SignupData) {
    const response = await fetch("/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    let body: { message?: string } = {};
    try {
        body = await response.json();
    } catch {
        if (response.ok) {
            throw new Error("The server returned an invalid response. Please try again.");
        }
    }

    if (!response.ok) {
        throw new Error(body.message ?? "Could not create your account. Please try again.");
    }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s()-]{7,20}$/;

const inputClassName =
    "box-border w-full rounded-[10px] border border-brand-border bg-brand-bg px-3 py-2.5 font-[inherit] text-sm text-brand-text-h transition-[border-color,box-shadow] duration-150 placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_18%,transparent)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 aria-[invalid=true]:border-brand-danger motion-reduce:transition-none";

function Field({
    id,
    label,
    error,
    children,
    className = "",
}: {
    id: string;
    label: string;
    error?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`grid content-start gap-1.5 ${className}`}>
            <label className="text-[.85rem] font-semibold text-brand-text-h" htmlFor={id}>
                {label}
            </label>
            {children}
            {error && (
                <span id={`${id}-error`} className="text-[.85rem] text-brand-danger">
                    {error}
                </span>
            )}
        </div>
    );
}

export default function SignupPage({
    onSubmit = defaultSubmit,
    productName = "Receptionist",
}: SignupProps) {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError("");

        const next: FieldErrors = {};
        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim();
        const trimmedPhone = phone.trim();

        if (!trimmedName) next.full_name = "Enter your full name.";
        if (!EMAIL_RE.test(trimmedEmail)) next.email = "Enter a valid email address.";
        if (!PHONE_RE.test(trimmedPhone)) next.phone = "Enter a valid phone number.";
        if (password.length < 8) next.pass = "Use at least 8 characters for your password.";
        if (confirmPassword !== password) next.confirmPassword = "Passwords do not match.";

        setErrors(next);
        if (Object.keys(next).length > 0) return;

        setLoading(true);
        try {
            await onSubmit({
                full_name: trimmedName,
                email: trimmedEmail,
                phone: trimmedPhone,
                pass: password,
            });
            setCreated(true);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "Could not create your account. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="grid min-h-screen grid-cols-[minmax(0,5fr)_minmax(0,6fr)] bg-brand-bg font-[family-name:var(--sans)] text-brand-text max-[800px]:grid-cols-1">
            <aside className="relative flex flex-col justify-between gap-6 overflow-hidden bg-brand-primary p-8 text-brand-on-primary before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-radial-gradient(circle_at_88%_14%,transparent_0_54px,color-mix(in_srgb,var(--on-primary)_11%,transparent)_54px_56px)] [&>*]:relative max-[800px]:gap-5 max-[800px]:px-6 max-[800px]:py-4 max-[800px]:before:hidden">
                <Link
                    to="/"
                    className="flex w-fit items-center gap-[.65rem] font-[family-name:var(--heading)] text-[1.15rem] font-bold text-brand-on-primary no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-on-primary"
                >
                    <span className="grid size-9 place-items-center rounded-[10px] bg-brand-on-primary text-brand-primary" aria-hidden="true">
                        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                        </svg>
                    </span>
                    {productName}
                </Link>

                <div className="max-w-[30rem]">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[.7rem] font-semibold">
                        <span className="size-2 rounded-full bg-brand-accent" />
                        Your clinic, running smoother
                    </span>
                    <h1 className="mt-4 font-[family-name:var(--heading)] text-[clamp(1.8rem,3vw,2.8rem)] font-bold leading-[1.08] tracking-[-.03em]">
                        Make every first impression a great one.
                    </h1>
                    <p className="mt-3 max-w-[28rem] text-sm leading-6 text-brand-on-primary/80">
                        Create your account to organize appointments, simplify reception, and give every patient a smoother experience.
                    </p>

                    <ul className="mt-5 grid gap-2.5 p-0 text-[.85rem]">
                        {[
                            "Keep appointments and patient details organized",
                            "Give your team one clear view of the daily queue",
                            "Spend less time on repetitive reception tasks",
                        ].map((benefit) => (
                            <li key={benefit} className="flex items-start gap-3">
                                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold" aria-hidden="true">
                                    ✓
                                </span>
                                <span>{benefit}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="m-0 text-xs text-brand-on-primary/70">
                    A calmer, more organized front desk starts here.
                </p>
            </aside>

            <section className="grid place-items-center bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[length:22px_22px] px-5 py-5">
                <div className="box-border w-full max-w-[34rem] rounded-[20px] border border-brand-border bg-brand-surface p-6 shadow-brand max-[800px]:p-5">
                    {created ? (
                        <div className="py-4 text-center" role="status">
                            <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-accent-bg text-2xl font-bold text-brand-secondary" aria-hidden="true">
                                ✓
                            </span>
                            <h2 className="mt-5 text-2xl font-bold tracking-[-.02em] text-brand-text-h">
                                Account created
                            </h2>
                            <p className="mt-2 leading-6 text-brand-muted">
                                Your {productName} account is ready. Sign in to get started.
                            </p>
                            <Link
                                to="/login"
                                className="mt-6 inline-flex w-full items-center justify-center rounded-[10px] bg-brand-primary px-4 py-3 font-semibold text-brand-on-primary no-underline transition-colors hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
                            >
                                Go to sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-5">
                                <p className="mb-1 text-xs font-semibold tracking-wide text-brand-primary">GET STARTED</p>
                                <h2 className="m-0 font-[family-name:var(--heading)] text-[1.65rem] font-bold leading-tight tracking-[-.02em] text-brand-text-h">
                                    Create your account
                                </h2>
                                <p className="mt-1.5 text-sm leading-5 text-brand-muted">
                                    Set up your account and bring your reception into one place.
                                </p>
                            </div>

                            <form className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
                                {formError && (
                                    <p className="col-span-full m-0 rounded-[10px] border border-brand-danger bg-[color-mix(in_srgb,var(--danger,#C92A2A)_8%,transparent)] px-[.85rem] py-[.7rem] text-[.92rem] text-brand-danger" role="alert">
                                        {formError}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    className="col-span-full flex w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border border-brand-border bg-brand-surface px-4 py-2.5 font-[inherit] text-sm font-semibold text-brand-text-h transition-colors hover:bg-brand-bg focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
                                >
                                    <span className="font-bold text-[#4285F4]" aria-hidden="true">G</span>
                                    Continue with Google
                                </button>
                                <div className="col-span-full flex items-center gap-3 text-xs text-brand-muted" aria-hidden="true">
                                    <span className="h-px flex-1 bg-brand-border" />
                                    or continue with email
                                    <span className="h-px flex-1 bg-brand-border" />
                                </div>

                                <Field id="full_name" label="Full name" error={errors.full_name}>
                                    <input
                                        id="full_name"
                                        name="full_name"
                                        type="text"
                                        className={inputClassName}
                                        autoComplete="name"
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        aria-invalid={!!errors.full_name}
                                        aria-describedby={errors.full_name ? "full_name-error" : undefined}
                                        placeholder="Your name"
                                        required
                                    />
                                </Field>

                                <Field id="email" label="Email address" error={errors.email}>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        className={inputClassName}
                                        autoComplete="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        aria-invalid={!!errors.email}
                                        aria-describedby={errors.email ? "email-error" : undefined}
                                        placeholder="you@business.com"
                                        required
                                    />
                                </Field>

                                <Field id="phone" label="Phone number" error={errors.phone}>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        className={inputClassName}
                                        autoComplete="tel"
                                        value={phone}
                                        onChange={(event) => setPhone(event.target.value)}
                                        aria-invalid={!!errors.phone}
                                        aria-describedby={errors.phone ? "phone-error" : undefined}
                                        placeholder="+1 (555) 123-4567"
                                        required
                                    />
                                </Field>

                                <Field id="password" label="Password" error={errors.pass}>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            className={`${inputClassName} pr-16`}
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            aria-invalid={!!errors.pass}
                                            aria-describedby={errors.pass ? "password-error" : undefined}
                                            placeholder="At least 8 characters"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-2 py-1 text-sm font-medium text-brand-muted hover:text-brand-text-h focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2"
                                            onClick={() => setShowPassword((visible) => !visible)}
                                            aria-pressed={showPassword}
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </Field>

                                <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword} className="sm:col-span-2">
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        className={inputClassName}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        aria-invalid={!!errors.confirmPassword}
                                        aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                                        placeholder="Enter your password again"
                                        required
                                    />
                                </Field>

                                <button
                                    type="submit"
                                    className="col-span-full mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-brand-primary px-4 py-2.5 font-[inherit] text-sm font-semibold text-brand-on-primary shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-[background,transform] duration-150 enabled:hover:[transform:translateY(-1px)] enabled:hover:bg-brand-primary-hover disabled:cursor-progress disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
                                    disabled={loading}
                                >
                                    {loading && (
                                        <span className="size-4 animate-login-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" />
                                    )}
                                    {loading ? "Creating account..." : "Create account"}
                                </button>
                            </form>

                            <p className="mt-4 mb-0 text-center text-sm text-brand-muted">
                                Already have an account?{" "}
                                <Link className="font-semibold text-brand-primary-hover no-underline hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2" to="/login">
                                    Sign in
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}