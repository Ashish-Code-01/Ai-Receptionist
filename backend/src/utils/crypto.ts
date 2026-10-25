import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const getEncryptionKey = (): Buffer => {
    const configuredKey = process.env.WA_TOKEN_ENC_KEY;
    if (!configuredKey) {
        throw new Error("WA_TOKEN_ENC_KEY is not configured");
    }

    const key = /^[\da-fA-F]{64}$/.test(configuredKey)
        ? Buffer.from(configuredKey, "hex")
        : Buffer.from(configuredKey, "utf8");

    if (key.byteLength !== 32) {
        throw new Error("WA_TOKEN_ENC_KEY must be a 32-byte key (64 hex characters)");
    }
    return key;
};

const AT_REST_PREFIX = "enc:v1:";

export const encrypt = (value: string): string => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv, authTag, ciphertext].map((part) => part.toString("base64")).join(":");
};

export const decrypt = (value: string): string => {
    const [encodedIv, encodedAuthTag, encodedCiphertext, ...extraParts] = value.split(":");
    if (!encodedIv || !encodedAuthTag || !encodedCiphertext || extraParts.length > 0) {
        throw new Error("Encrypted WhatsApp token has an invalid format");
    }

    const decipher = createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(encodedIv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64"));

    return Buffer.concat([
        decipher.update(Buffer.from(encodedCiphertext, "base64")),
        decipher.final(),
    ]).toString("utf8");
};

/** Mark values encrypted with this format so migrations can safely run more than once. */
export const encryptAtRest = (value: string): string => `${AT_REST_PREFIX}${encrypt(value)}`;

export const isEncryptedAtRest = (value: string): boolean => value.startsWith(AT_REST_PREFIX);

export const decryptAtRest = (value: string): string => {
    if (!isEncryptedAtRest(value)) {
        throw new Error("Stored credential is not encrypted with the supported format");
    }
    return decrypt(value.slice(AT_REST_PREFIX.length));
};
