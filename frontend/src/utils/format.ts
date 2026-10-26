const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

const currencyFormatters = {
    regular: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }),
    compact: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }),
};

export function formatDate(value: string | Date): string {
    if (value instanceof Date) return dateFormatter.format(value);

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(value);

    return dateFormatter.format(date);
}

export function formatCurrency(amount: number, options: { compact?: boolean } = {}): string {
    return currencyFormatters[options.compact ? "compact" : "regular"].format(amount);
}
