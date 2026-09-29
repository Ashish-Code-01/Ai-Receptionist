
const EXOTEL_CHUNK_BYTES = 3200;

export function sendToExotel(session: any, obj: unknown) {
    if (session.exotelWs.readyState === WebSocket.OPEN) session.exotelWs.send(JSON.stringify(obj));
}

function sendPcmChunk(session: any, chunk: any) {
    sendToExotel(session, {
        event: 'media',
        stream_sid: session.streamSid,
        media: { payload: chunk.toString('base64') },
    });
}

/** Queue 8 kHz PCM and send it to Exotel in properly sized chunks. */
export function queueAudioToExotel(session: any, pcm8k: any) {
    session.outBuf = Buffer.concat([session.outBuf, pcm8k]);
    while (session.outBuf.length >= EXOTEL_CHUNK_BYTES) {
        sendPcmChunk(session, session.outBuf.subarray(0, EXOTEL_CHUNK_BYTES));
        session.outBuf = session.outBuf.subarray(EXOTEL_CHUNK_BYTES);
    }
}

/** Send whatever is left (padded with silence) at the end of a model turn. */
export function flushAudioToExotel(session: any) {
    if (session.outBuf.length === 0) return;
    const padded = Buffer.alloc(EXOTEL_CHUNK_BYTES);
    session.outBuf.copy(padded);
    sendPcmChunk(session, padded);
    session.outBuf = Buffer.alloc(0);
}