import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

type ForgotPasswordData = {
    email: string;
};

type ForgotPasswordProps = {
    onSubmit?: (data: ForgotPasswordData) => Promise<void>;
    productName?: string;
};

async function defaultSubmit(data: ForgotPasswordData) {
    const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
    });

    let body: { message?: string } = {};
    try {
        body = await response.json();
    } catch {
        // Ignore empty or non-JSON responses; the status code is enough.
    }

    if (!response.ok) {
        throw new Error(body.message ?? "We could not send a reset link. Please try again.");
    }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inputClassName = "box-border w-full rounded-[10px] border border-brand-border bg-brand-bg px-3 py-2.5 font-[inherit] text-sm text-brand-text-h transition-[border-color,box-shadow] duration-150 placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_18%,transparent)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 aria-[invalid=true]:border-brand-danger motion-reduce:transition-none";

export default function ForgotPasswordPage({
    onSubmit = defaultSubmit,
    productName = "Receptionist",
}: ForgotPasswordProps) {
    const [email, setEmail] = useState("");
    const [errors, setErrors] = useState<{ email?: string }>({});
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError("");

        const next: { email?: string } = {};
        const trimmedEmail = email.trim();

        if (!EMAIL_RE.test(trimmedEmail)) {
            next.email = "Enter a valid email address.";
        }

        setErrors(next);
        if (Object.keys(next).length > 0) return;

        setLoading(true);
        try {
            await onSubmit({ email: trimmedEmail });
            setSent(true);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "Could not send the password reset link.");
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
                        Stay connected to your clinic
                    </span>
                    <h1 className="mt-4 font-[family-name:var(--heading)] text-[clamp(1.8rem,3vw,2.8rem)] font-bold leading-[1.08] tracking-[-.03em]">
                        Reset access without the usual back-and-forth.
                    </h1>
                    <p className="mt-3 max-w-[28rem] text-sm leading-6 text-brand-on-primary/80">
                        Get back into your dashboard quickly so your team can keep appointments moving and patients informed.
                    </p>

                    <ul className="mt-5 grid gap-2.5 p-0 text-[.85rem]">
                        {[
                            "Restore secure access in a few clicks",
                            "Keep your clinic schedule running without disruption",
                            "Avoid long phone delays during busy reception hours",
                        ].map((item) => (
                            <li key={item} className="flex items-start gap-3">
                                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold" aria-hidden="true">
                                    ✓
                                </span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="m-0 text-xs text-brand-on-primary/70">
                    Secure, simple access for a smoother front desk.
                </p>
            </aside>

            <section className="grid place-items-center bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[length:22px_22px] px-5 py-5">
                <div className="box-border w-full max-w-[34rem] rounded-[20px] border border-brand-border bg-brand-surface p-6 shadow-brand max-[800px]:p-5">
                    {sent ? (
                        <div className="py-4 text-center" role="status">
                            <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-accent-bg text-2xl font-bold text-brand-secondary" aria-hidden="true">
                                ✓
                            </span>
                            <h2 className="mt-5 text-2xl font-bold tracking-[-.02em] text-brand-text-h">
                                Check your inbox
                            </h2>
                            <p className="mt-2 leading-6 text-brand-muted">
                                We sent a secure reset link to <span className="font-semibold text-brand-text-h">{email}</span>.
                                It may take a minute to arrive.
                            </p>
                            <div className="mt-6 grid gap-3 text-left">
                                <button
                                    type="button"
                                    onClick={() => setSent(false)}
                                    className="inline-flex w-full items-center justify-center rounded-[10px] bg-brand-primary px-4 py-3 font-semibold text-brand-on-primary transition-colors hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
                                >
                                    Send another link
                                </button>
                                <Link
                                    to="/login"
                                    className="inline-flex w-full items-center justify-center rounded-[10px] border border-brand-border bg-brand-bg px-4 py-3 font-semibold text-brand-text-h no-underline transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
                                >
                                    Back to sign in
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-5">
                                <p className="mb-1 text-xs font-bold tracking-[.14em] text-brand-primary">PASSWORD RESET</p>
                                <h2 className="m-0 font-[family-name:var(--heading)] text-[1.65rem] font-bold leading-tight tracking-[-.02em] text-brand-text-h">
                                    Forgot your password?
                                </h2>
                                <p className="mt-1.5 text-sm leading-5 text-brand-muted">
                                    Enter your email and we’ll send you a secure link to reset it.
                                </p>
                            </div>

                            <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
                                {formError && (
                                    <p className="m-0 rounded-[10px] border border-brand-danger bg-[color-mix(in_srgb,var(--danger,#C92A2A)_8%,transparent)] px-[.85rem] py-[.7rem] text-[.92rem] text-brand-danger" role="alert">
                                        {formError}
                                    </p>
                                )}

                                <div className="grid gap-1.5">
                                    <label className="text-[.9rem] font-semibold text-brand-text-h" htmlFor="email">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        className={inputClassName}
                                        autoComplete="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        aria-invalid={!!errors.email}
                                        aria-describedby={errors.email ? "email-error" : undefined}
                                        placeholder="you@business.com"
                                    />
                                    {errors.email && (
                                        <span id="email-error" className="text-[.85rem] text-brand-danger">
                                            {errors.email}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-brand-primary px-4 py-2.5 font-[inherit] text-sm font-semibold text-brand-on-primary shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-[background,transform] duration-150 enabled:hover:[transform:translateY(-1px)] enabled:hover:bg-brand-primary-hover disabled:cursor-progress disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
                                    disabled={loading}
                                >
                                    {loading && (
                                        <span className="size-4 animate-login-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" />
                                    )}
                                    {loading ? "Sending reset link..." : "Send reset link"}
                                </button>
                            </form>

                            <p className="mt-4 mb-0 text-center text-sm text-brand-muted">
                                Remembered your password?{" "}
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
