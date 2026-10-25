import { GRAPH_API_VERSION } from "../constants/meta.js";

type GraphRequestOptions = {
    method?: "GET" | "POST";
    accessToken?: string;
    query?: Record<string, string>;
    body?: unknown;
};

export class MetaGraphError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly metaCode?: number,
    ) {
        super(message);
        this.name = "MetaGraphError";
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

export const graphRequest = async <T>(
    path: string,
    options: GraphRequestOptions,
    isExpectedResponse: (value: unknown) => value is T,
): Promise<T> => {
    const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
        url.searchParams.set(key, value);
    }

    const headers = new Headers();
    if (options.accessToken) {
        headers.set("Authorization", `Bearer ${options.accessToken}`);
    }
    if (options.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    let response: globalThis.Response;
    try {
        response = await fetch(url, {
            method: options.method ?? "GET",
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
        });
    } catch {
        console.error("Meta Graph API network request failed", { path });
        throw new MetaGraphError("Could not reach Meta Graph API", 0);
    }

    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        console.error("Meta Graph API returned invalid JSON", { path, status: response.status });
        throw new MetaGraphError("Meta Graph API returned an invalid response", response.status);
    }

    if (!response.ok) {
        const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null;
        const message = error && typeof error.message === "string"
            ? error.message
            : "Meta Graph API request failed";
        const code = error && typeof error.code === "number" ? error.code : undefined;
        console.error("Meta Graph API request failed", { path, status: response.status, code });
        throw new MetaGraphError(message, response.status, code);
    }

    if (!isExpectedResponse(payload)) {
        console.error("Meta Graph API returned an unexpected response", { path, status: response.status });
        throw new MetaGraphError("Meta Graph API returned an unexpected response", response.status);
    }
    return payload;
};

export const isGraphRecord = (value: unknown): value is Record<string, unknown> =>
    isRecord(value);
