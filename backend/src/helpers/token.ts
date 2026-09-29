import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

export const signToken = (id: number, email: string): string => {
    return jwt.sign(
        { id, email },
        JWT_SECRET,
        { expiresIn: "24h" }
    );
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET);
};