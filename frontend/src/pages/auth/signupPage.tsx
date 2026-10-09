import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../constants/apis";

type SignupData = {
    full_name: string;
    email: string;
    phone: string;
    pass: string;
};

type SignupProps = {
    productName?: string;
};

type FieldErrors = Partial<Record<keyof SignupData | "confirmPassword", string>>;

const SIGNUP_URL = `${API_BASE_URL}/user/signup`;

function getGoogleOAuthMessage() {
    const error = new URLSearchParams(window.location.search).get("google");
    switch (error) {
        case "not_configured":
            return "Google sign-in isn’t configured yet. Please contact the administrator or sign up with email.";
        case "cancelled":
            return "Google sign-in was cancelled.";
        case "account_conflict":
            return "This email is linked to a different Google account. Sign in with the account you originally connected.";
        case "unverified_email":
            return "Google did not provide a verified email address. Please try another account.";
        case "invalid_state":
            return "Your Google sign-in session expired. Please try again.";
        case "failed":
            return "Google sign-in failed. Please try again.";
        default:
            return "";
    }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS_RE = /^\+?[0-9\s()-]+$/;

function isValidPhone(value: string) {
    if (!PHONE_CHARS_RE.test(value)) return false;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
}

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
    children: ReactNode;
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
    productName = "Receptionist",
}: SignupProps) {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState(getGoogleOAuthMessage);
    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState(false);
    const [signedInAfterSignup, setSignedInAfterSignup] = useState(false);
    const [signupLoginError, setSignupLoginError] = useState("");

    function clearError(key: keyof FieldErrors) {
        setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading) return;
        setFormError("");

        const next: FieldErrors = {};
        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPhone = phone.trim();

        if (!trimmedName) next.full_name = "Enter your full name.";
        if (!EMAIL_RE.test(trimmedEmail)) next.email = "Enter a valid email address.";
        if (!isValidPhone(trimmedPhone)) next.phone = "Enter a valid phone number (10 to 15 digits).";
        if (password.length < 8) next.pass = "Use at least 8 characters for your password.";
        if (confirmPassword !== password) next.confirmPassword = "Passwords do not match.";

        setErrors(next);
        if (Object.keys(next).length > 0) return;

        const normalizedPhone = trimmedPhone.replace(/[\s\-()]/g, "");

        setLoading(true);
        try {
            const payload: SignupData = {
                full_name: trimmedName,
                email: trimmedEmail,
                phone: normalizedPhone,
                pass: password,
            };
            await axios.post(SIGNUP_URL, payload);
            setCreated(true);

            try {
                await axios.post(
                    `${API_BASE_URL}/user/login`,
                    { identity: trimmedEmail, pass: password },
                    { withCredentials: true },
                );
                setSignedInAfterSignup(true);
            } catch (loginError: unknown) {
                setSignedInAfterSignup(false);
                const loginMessage =
                    axios.isAxiosError<{ message?: string }>(loginError) &&
                        typeof loginError.response?.data?.message === "string"
                        ? loginError.response.data.message
                        : axios.isAxiosError(loginError) && !loginError.response
                            ? "Your account was created, but we couldn't connect to sign you in. Please sign in to continue."
                            : "Your account was created, but automatic sign-in failed. Please sign in to continue.";
                setSignupLoginError(loginMessage);
            }
        } catch (error) {
            let message = "Could not create your account. Please try again.";

            if (axios.isAxiosError<{ message?: string }>(error)) {
                const status = error.response?.status;
                if (error.response?.data?.message) message = error.response.data.message;
                else if (status === 409) message = "An account with this email or phone already exists. Try signing in.";
                else if (status === 429) message = "Too many attempts. Please wait and try again.";
                else if (!error.response) message = "Network error. Check your connection.";
            }

            setFormError(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="grid min-h-screen grid-cols-[minmax(0,5fr)_minmax(0,6fr)] bg-brand-bg font-(family-name:--sans) text-brand-text max-[800px]:grid-cols-1">
            <aside className="relative flex flex-col justify-between gap-6 overflow-hidden bg-brand-primary p-8 text-brand-on-primary before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-radial-gradient(circle_at_88%_14%,transparent_0_54px,color-mix(in_srgb,var(--on-primary)_11%,transparent)_54px_56px)] :relative max-[800px]:gap-5 max-[800px]:px-6 max-[800px]:py-4 max-[800px]:before:hidden">
                <Link
                    to="/"
                    className="flex w-fit items-center gap-[.65rem] font-(family-name:--heading) text-[1.15rem] font-bold text-brand-on-primary no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-on-primary"
                >
                    <span className="grid size-9 place-items-center rounded-[10px] bg-brand-on-primary text-brand-primary" aria-hidden="true">
                        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                        </svg>
                    </span>
                    {productName}
                </Link>

                <div className="max-w-120">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[.7rem] font-semibold">
                        <span className="size-2 rounded-full bg-brand-accent" />
                        Your clinic, running smoother
                    </span>
                    <h1 className="mt-4 font-(family-name:--heading) text-[clamp(1.8rem,3vw,2.8rem)] font-bold leading-[1.08] tracking-[-.03em]">
                        Make every first impression a great one.
                    </h1>
                    <p className="mt-3 max-w-120 text-sm leading-6 text-brand-on-primary/80">
                        Create your account to organize appointments, simplify reception, and give every patient a smoother experience.
                    </p>

                    <ul className="mt-5 grid list-none gap-2.5 p-0 text-[.85rem]">
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

            <section className="grid place-items-center bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[22px_22px] px-5 py-5">
                <div className="box-border w-full max-w-136 rounded-[20px] border border-brand-border bg-brand-surface p-6 shadow-brand max-[800px]:p-5">
                    {created ? (
                        <div className="py-4 text-center" role="status">
                            <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-accent-bg text-2xl font-bold text-brand-secondary" aria-hidden="true">
                                ✓
                            </span>
                            <h2 className="mt-5 text-2xl font-bold tracking-[-.02em] text-brand-text-h">
                                Account created
                            </h2>
                            <p className="mt-2 leading-6 text-brand-muted">
                                {signedInAfterSignup
                                    ? `Your ${productName} account is ready. Continue to set up your clinic details.`
                                    : `Your ${productName} account is ready. Sign in to continue setting up your clinic details.`}
                            </p>
                            {signupLoginError && (
                                <p className="mt-3 rounded-xl border border-brand-accent-border bg-brand-accent-bg px-3 py-2 text-sm text-brand-text" role="status">
                                    {signupLoginError}
                                </p>
                            )}
                            <Link
                                to={signedInAfterSignup ? "/details" : "/login"}
                                className="mt-6 inline-flex w-full items-center justify-center rounded-[10px] bg-brand-primary px-4 py-3 font-semibold text-brand-on-primary no-underline transition-colors hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
                            >
                                {signedInAfterSignup ? "Next step: Clinic details" : "Sign in to continue"}
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-5">
                                <p className="mb-1 text-xs font-bold tracking-[.14em] text-brand-primary">NEW ACCOUNT</p>
                                <h2 className="m-0 font-(family-name:--heading) text-[1.65rem] font-bold leading-tight tracking-[-.02em] text-brand-text-h">
                                    Set up your account
                                </h2>
                                <p className="mt-1.5 text-sm leading-5 text-brand-muted">
                                    Create a workspace for your clinic and team.
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
                                    className="col-span-full flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#DADCE0] bg-white px-4 py-3 font-[inherit] text-sm font-semibold text-[#3C4043] shadow-[0_2px_5px_rgba(60,64,67,.16)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-[#B8C5D3] hover:shadow-[0_5px_14px_rgba(60,64,67,.2)] focus-visible:outline-2 focus-visible:outline-[#4285F4] focus-visible:outline-offset-2 motion-reduce:transition-none"
                                    onClick={() => window.location.assign(`${API_BASE_URL}/user/google?flow=signup`)}
                                >
                                    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.05 5.05 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84A11 11 0 0 0 12 23Z" />
                                        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.15a11 11 0 0 0 0 9.88l3.69-2.84Z" />
                                        <path fill="#EA4335" d="M12 5.36c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.85 6.06l3.69 2.84c.87-2.6 3.3-4.54 6.16-4.54Z" />
                                    </svg>
                                    Continue with Google
                                </button>
                                <div className="col-span-full flex items-center gap-3 text-xs text-brand-muted" aria-hidden="true">
                                    <span className="h-px flex-1 bg-brand-border" />
                                    OR SIGN UP WITH EMAIL
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
                                        onChange={(event) => {
                                            setFullName(event.target.value);
                                            clearError("full_name");
                                        }}
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
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        value={email}
                                        onChange={(event) => {
                                            setEmail(event.target.value);
                                            clearError("email");
                                        }}
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
                                        onChange={(event) => {
                                            setPhone(event.target.value);
                                            clearError("phone");
                                        }}
                                        aria-invalid={!!errors.phone}
                                        aria-describedby={errors.phone ? "phone-error" : undefined}
                                        placeholder="+91 98765 43210"
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
                                            onChange={(event) => {
                                                setPassword(event.target.value);
                                                clearError("pass");
                                            }}
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
                                        onChange={(event) => {
                                            setConfirmPassword(event.target.value);
                                            clearError("confirmPassword");
                                        }}
                                        aria-invalid={!!errors.confirmPassword}
                                        aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                                        placeholder="Enter your password again"
                                        required
                                    />
                                </Field>

                                <button
                                    type="submit"
                                    className="col-span-full mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-brand-primary px-4 py-2.5 font-[inherit] text-sm font-semibold text-brand-on-primary shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-[background,transform] duration-150 enabled:hover:transform-[translateY(-1px)] enabled:hover:bg-brand-primary-hover disabled:cursor-progress disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
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