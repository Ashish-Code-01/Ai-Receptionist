export type ConversationMessage = {
    direction: "in" | "out";
    body: string;
};

export type BusinessInfo = {
    businessName: string;
    timings: {
        days: number[];
        start: string;
        end: string;
    } | null;
    services: string[];
    faqs: { question: string; answer: string }[];
    customInstructions: string | null;
};

export const generateReply = async (
    userId: number,
    history: ConversationMessage[],
    text: string,
    businessInfo: BusinessInfo | null,
): Promise<string> => {
    void userId;
    void history;
    void text;
    void businessInfo;

    // TODO: Build a system prompt from businessInfo and call the AI receptionist service.
    return "Thanks for your message! Our team will get back to you soon.";
};
