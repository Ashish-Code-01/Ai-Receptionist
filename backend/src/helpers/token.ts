import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
export const SESSION_COOKIE_NAME = "token";
export const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
};

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

export const readSessionToken = (cookieHeader: string | undefined): string | undefined => {
    const tokenCookie = cookieHeader
        ?.split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

    return tokenCookie?.slice(SESSION_COOKIE_NAME.length + 1);
};

export const signToken = (id: number, email: string): string => {
    return jwt.sign(
        { id, email },
        JWT_SECRET,
        { expiresIn: "24h" }
    );
};

export const verifyToken = (token: string) => {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
};