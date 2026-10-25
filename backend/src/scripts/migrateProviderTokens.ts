import type { RowDataPacket } from "mysql2";
import pool from "../config/db.js";
import {
    decryptAtRest,
    encryptAtRest,
    isEncryptedAtRest,
} from "../utils/crypto.js";

interface DetailRow extends RowDataPacket {
    id: number;
    google_refresh_token: string | null;
    whatsapp_token: string | null;
}

const BATCH_SIZE = 100;

const main = async (): Promise<void> => {
    let lastId = 0;
    let migrated = 0;

    try {
        while (true) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                const [rows] = await connection.query<DetailRow[]>(
                    `SELECT id, google_refresh_token, whatsapp_token
                     FROM Details WHERE id > ? ORDER BY id LIMIT ${BATCH_SIZE} FOR UPDATE`,
                    [lastId],
                );

                if (rows.length === 0) {
                    await connection.commit();
                    break;
                }

                for (const row of rows) {
                    const googleToken = row.google_refresh_token;
                    const whatsappToken = row.whatsapp_token;
                    const updatedGoogle = googleToken === null
                        ? null
                        : isEncryptedAtRest(googleToken)
                            ? (decryptAtRest(googleToken), googleToken)
                            : encryptAtRest(googleToken);
                    const updatedWhatsApp = whatsappToken === null
                        ? null
                        : isEncryptedAtRest(whatsappToken)
                            ? (decryptAtRest(whatsappToken), whatsappToken)
                            : encryptAtRest(whatsappToken);

                    if (updatedGoogle !== googleToken || updatedWhatsApp !== whatsappToken) {
                        await connection.execute(
                            `UPDATE Details
                             SET google_refresh_token = ?, whatsapp_token = ?
                             WHERE id = ?`,
                            [updatedGoogle, updatedWhatsApp, row.id],
                        );
                        migrated += 1;
                    }
                    lastId = row.id;
                }

                await connection.commit();
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }

        console.info(`Provider credential migration complete; ${migrated} Details rows updated.`);
    } finally {
        await pool.end();
    }
};

main().catch((error: unknown) => {
    console.error(
        "Provider credential migration failed:",
        error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
});
