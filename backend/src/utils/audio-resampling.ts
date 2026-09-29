/** 8 kHz PCM16 -> 16 kHz PCM16 (linear interpolation) */
export function upsample8to16(buf: any) {
    const n = buf.length >> 1;
    const out = Buffer.alloc(n * 4);
    for (let i = 0; i < n; i++) {
        const a = buf.readInt16LE(i * 2);
        const b = i + 1 < n ? buf.readInt16LE((i + 1) * 2) : a;
        out.writeInt16LE(a, i * 4);
        out.writeInt16LE((a + b) >> 1, i * 4 + 2);
    }
    return out;
}

/** 24 kHz PCM16 -> 8 kHz PCM16 (average every 3 samples). Keeps leftover in session.dsRem. */
export function downsample24to8(session: any, buf: any) {
    const input = Buffer.concat([session.dsRem, buf]);
    const groups = Math.floor(input.length / 6);
    const out = Buffer.alloc(groups * 2);
    for (let i = 0; i < groups; i++) {
        const s =
            input.readInt16LE(i * 6) + input.readInt16LE(i * 6 + 2) + input.readInt16LE(i * 6 + 4);
        out.writeInt16LE(Math.round(s / 3), i * 2);
    }
    session.dsRem = input.subarray(groups * 6);
    return out;
}