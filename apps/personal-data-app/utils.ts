// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON } from '@klave/sdk';
import * as Base64 from "as-base64/assembly";


export function hexEncode(data: Uint8Array) : string {
    let hex = "";
    for (let i = 0; i < data.length; i++) {
        hex += data[i].toString(16);
    }
    return hex;
}

export function hexDecode(hex: string) : Uint8Array {
    let data = new Uint8Array(hex.length >>> 1);
    for (let i = 0; i < hex.length >>> 1; ++i) {
        data.fill(i32(parseInt('0x' + hex.substr(i * 2, 2), 16)), i, i + 1);
    }
    return data;
}

export function removeItem<T>(arr: Array<T>, value: T) : Array<T> {
    const index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}

export function concatArrays(a: Uint8Array, b: Uint8Array) : Uint8Array {
    let concat = new Uint8Array(a.length + b.length);
    concat.set(a);
    concat.set(b, a.length);
    return concat;
}

export function base64Encode<T>(obj: T, urlMode : boolean = false): string {
    let b64 = Base64.encode(Uint8Array.wrap(String.UTF8.encode(JSON.stringify(obj))));
    return urlMode ? toUrlMode(b64) : b64;
}

export function toUrlMode(base64: string): string {
    return base64.replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}

export function fromUrlMode(base64: string): string {
    base64 = base64.replaceAll("-", "+").replaceAll("_", "/");
    const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    return base64 + padding;
}