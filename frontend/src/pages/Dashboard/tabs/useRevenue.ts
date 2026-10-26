import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../constants/apis";
import type { DateRange, RevenueData } from "./revenueTypes";
import { previousRange } from "./revenueUtils";

type RevenueResponse = { success: boolean; data: RevenueData };
type ResultState =
    | { key: string; status: "success"; current: RevenueData; previous: RevenueData | null; comparisonUnavailable: boolean }
    | { key: string; status: "error"; message: string };

export function useRevenue(businessId: number | null, range: DateRange, retryKey = 0) {
    const key = `${businessId ?? ""}:${range.from}:${range.to}:${retryKey}`;
    const [result, setResult] = useState<ResultState | null>(null);
    const currentResult = result?.key === key ? result : null;

    useEffect(() => {
        if (!businessId || !range.from || !range.to || range.to < range.from) return;

        const controller = new AbortController();
        const previous = previousRange(range);
        const request = (dateRange: DateRange) => axios.get<RevenueResponse>(
            `${API_BASE_URL}/details/${businessId}/revenue`,
            {
                params: dateRange,
                withCredentials: true,
                signal: controller.signal,
            },
        );

        void Promise.allSettled([request(range), request(previous)]).then(([currentResponse, previousResponse]) => {
            if (controller.signal.aborted) return;

            if (currentResponse.status === "rejected") {
                setResult({
                    key,
                    status: "error",
                    message: "Could not load revenue for this date range.",
                });
                return;
            }

            setResult({
                key,
                status: "success",
                current: currentResponse.value.data.data,
                previous: previousResponse.status === "fulfilled" ? previousResponse.value.data.data : null,
                comparisonUnavailable: previousResponse.status === "rejected",
            });
        });

        return () => controller.abort();
    }, [businessId, key, range, range.from, range.to, retryKey]);

    return {
        data: currentResult?.status === "success" ? currentResult.current : null,
        previous: currentResult?.status === "success" ? currentResult.previous : null,
        comparisonUnavailable: currentResult?.status === "success" && currentResult.comparisonUnavailable,
        loading: Boolean(businessId) && currentResult === null,
        error: currentResult?.status === "error" ? currentResult.message : "",
    };
}
