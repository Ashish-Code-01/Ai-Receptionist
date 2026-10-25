import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../constants/apis";

type SignupDetails = {
    waba_id: string;
    phone_number_id: string;
};

type FacebookLoginResponse = {
    authResponse?: {
        code?: string;
    };
    status?: string;
};

type FacebookLoginOptions = {
    config_id: string;
    response_type: "code";
    override_default_response_type: true;
    extras: {
        setup: Record<string, never>;
        sessionInfoVersion: "3";
    };
};

type FacebookSdk = {
    init: (options: { appId: string; version: string; xfbml: boolean; cookie: boolean }) => void;
    login: (
        callback: (response: FacebookLoginResponse) => void,
        options: FacebookLoginOptions,
    ) => void;
};

declare global {
    interface Window {
        FB?: FacebookSdk;
        fbAsyncInit?: () => void;
    }
}

type Props = {
    onConnected: (phone: string) => void;
};

type ConnectResponse = {
    ok: boolean;
    phone: string;
};

let sdkPromise: Promise<FacebookSdk> | null = null;
let sdkInitializedFor: string | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const loadFacebookSdk = (): Promise<FacebookSdk> => {
    if (window.FB) return Promise.resolve(window.FB);
    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise<FacebookSdk>((resolve, reject) => {
        const existingScript = document.getElementById("facebook-jssdk") as HTMLScriptElement | null;
        const script = existingScript ?? document.createElement("script");
        const onLoad = () => {
            if (window.FB) resolve(window.FB);
            else reject(new Error("Facebook SDK did not initialize"));
        };
        const onError = () => reject(new Error("Could not load Facebook SDK"));

        script.addEventListener("load", onLoad, { once: true });
        script.addEventListener("error", onError, { once: true });
        window.fbAsyncInit = () => {
            if (window.FB) resolve(window.FB);
        };

        if (!existingScript) {
            script.id = "facebook-jssdk";
            script.async = true;
            script.src = "https://connect.facebook.net/en_US/sdk.js";
            document.head.appendChild(script);
        } else if (window.FB) {
            resolve(window.FB);
        }
    }).catch((error: unknown) => {
        sdkPromise = null;
        throw error;
    });

    return sdkPromise;
};

const parseSignupDetails = (value: unknown): SignupDetails | null => {
    let parsed = value;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed) as unknown;
        } catch {
            return null;
        }
    }
    if (!isRecord(parsed)) return null;
    const wabaId = parsed.waba_id;
    const phoneNumberId = parsed.phone_number_id;
    if (
        typeof wabaId !== "string"
        || !/^\d{1,64}$/.test(wabaId)
        || typeof phoneNumberId !== "string"
        || !/^\d{1,64}$/.test(phoneNumberId)
    ) {
        return null;
    }
    return { waba_id: wabaId, phone_number_id: phoneNumberId };
};

const isFacebookOrigin = (origin: string): boolean => {
    try {
        const hostname = new URL(origin).hostname;
        return hostname === "facebook.com" || hostname.endsWith(".facebook.com");
    } catch {
        return false;
    }
};

export default function ConnectWhatsApp({ onConnected }: Props) {
    const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [error, setError] = useState("");
    const signupDetails = useRef<SignupDetails | null>(null);

    useEffect(() => {
        const onMessage = (event: MessageEvent<unknown>) => {
            if (!isFacebookOrigin(event.origin) || !isRecord(event.data)) return;
            if (
                event.data.type !== "WA_EMBEDDED_SIGNUP"
                || event.data.event !== "FINISH"
            ) {
                return;
            }
            signupDetails.current = parseSignupDetails(event.data.data);
        };

        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, []);

    const waitForSignupDetails = async (): Promise<SignupDetails> => {
        const deadline = Date.now() + 3_000;
        while (Date.now() < deadline) {
            if (signupDetails.current) return signupDetails.current;
            await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
        }
        throw new Error("Meta did not return your WhatsApp account details. Please try again.");
    };

    const connect = async () => {
        setState("loading");
        setError("");
        signupDetails.current = null;

        try {
            const appId = import.meta.env.VITE_META_APP_ID;
            const configId = import.meta.env.VITE_META_CONFIG_ID;
            if (!appId || !configId) {
                throw new Error("WhatsApp signup is not configured. Please contact support.");
            }

            const sdk = await loadFacebookSdk();
            if (sdkInitializedFor !== appId) {
                sdk.init({ appId, version: "v21.0", xfbml: false, cookie: true });
                sdkInitializedFor = appId;
            }

            const loginResponse = await new Promise<FacebookLoginResponse>((resolve, reject) => {
                const timeout = window.setTimeout(
                    () => reject(new Error("Meta signup was cancelled or timed out. Please try again.")),
                    120_000,
                );
                try {
                    sdk.login((response) => {
                        window.clearTimeout(timeout);
                        resolve(response);
                    }, {
                        config_id: configId,
                        response_type: "code",
                        override_default_response_type: true,
                        extras: { setup: {}, sessionInfoVersion: "3" },
                    });
                } catch (error) {
                    window.clearTimeout(timeout);
                    reject(error);
                }
            });
            const code = loginResponse.authResponse?.code;
            if (!code) throw new Error("Meta did not return an authorization code. Please try again.");

            const details = await waitForSignupDetails();
            const response = await axios.post<ConnectResponse>(
                `${API_BASE_URL}/whatsapp/connect`,
                { code, ...details },
                { withCredentials: true },
            );
            if (!response.data.ok || typeof response.data.phone !== "string") {
                throw new Error("WhatsApp could not be connected. Please try again.");
            }
            setState("success");
            onConnected(response.data.phone);
        } catch (connectError) {
            const message = axios.isAxiosError(connectError)
                && isRecord(connectError.response?.data)
                && typeof connectError.response.data.message === "string"
                ? connectError.response.data.message
                : connectError instanceof Error
                    ? connectError.message
                    : "WhatsApp could not be connected. Please try again.";
            setError(message);
            setState("error");
        }
    };

    return (
        <div className="grid justify-items-start gap-3">
            <button
                type="button"
                onClick={() => void connect()}
                disabled={state === "loading"}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 font-semibold text-brand-on-primary transition hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
            >
                {state === "loading" ? "Connecting..." : state === "success" ? "Connect another number" : "Connect WhatsApp"}
            </button>
            {state === "error" && (
                <p className="m-0 text-sm text-brand-danger" role="alert">{error}</p>
            )}
        </div>
    );
}
