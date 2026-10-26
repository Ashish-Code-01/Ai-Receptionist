export type RevenueDay = {
    date: string;
    payments: number;
    amount: number;
};

export type RevenueData = {
    currency: string;
    today: { amount: number; payments: number };
    from: string;
    to: string;
    days: RevenueDay[];
    paymentMethods?: { method: "cash" | "upi" | "card" | "other"; amount: number; payments: number }[];
};

export type DateRange = {
    from: string;
    to: string;
};

export type RevenuePreset = "today" | "yesterday" | "last7" | "thisMonth" | "lastMonth" | "custom";

export type RevenuePresetSelection = DateRange & {
    preset: RevenuePreset;
};
