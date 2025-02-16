// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Context, Crypto } from '@klave/sdk';
import * as Base64 from "as-base64/assembly";

export function computeCode(seed: Uint8Array, timeStep: u64, codeDigits: u32) : string {

    // Verify length
    if (codeDigits < 6 || codeDigits > 8)
        return "";

    // Convert time step to little endian
    let b = new ArrayBuffer(8);
    let v = new DataView(b);
    v.setUint64(0, timeStep, true);

    // Compute hmac
    let hmacKey = Crypto.Subtle.importKey("raw", b, {name: "HMAC", hash: "SHA-1", length: 8}, true, ["sign", "verify"]);
    if (!hmacKey.data)
        return "";
    let hmacRes = Crypto.Subtle.sign("HMAC", hmacKey.data, seed.buffer);
    if (!hmacRes.data)
        return "";
    let hmac = Uint8Array.wrap(hmacRes.data);

    // Compute code
    let offset = hmac[hmac.length - 1] & 0x0f;
    let binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    let digitPower = codeDigits == 6 ? 1000000 : codeDigits == 7 ? 10000000 : 100000000;
    let otp = binary % digitPower;
    let code = otp.toString();
    while (code.length < codeDigits) {
        code = "0" + code;
    }

    return code;
}

export function totpVerifyCodeWithStep(code: string, seed: Uint8Array, timeStep: u64) : bool {

    if (code.length < 6 || code.length > 8)
        return false; // we do not allow short code sizes

    let computedCode = computeCode(seed, timeStep, code.length);
    return code == computedCode;
}

export function totpVerifyCode(code: string, seed: string) : bool
{
    if (code.length < 6 || code.length > 8)
        return false; // we do not allow short code sizes

    let utcNow = u64.parse(Context.get("trusted_time"));
    let step30Sec = utcNow / 30000000000;
    let seedBytes = Base64.decode(seed);

    // Try the three surrounding ranges of 30 sec
    return totpVerifyCodeWithStep(code, seedBytes, step30Sec)
        || totpVerifyCodeWithStep(code, seedBytes, step30Sec - 1)
        || totpVerifyCodeWithStep(code, seedBytes, step30Sec + 1);
}