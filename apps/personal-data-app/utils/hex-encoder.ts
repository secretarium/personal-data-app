// Copyright 2025 Secretarium Ltd <contact@secretarium.org>


export function encode(data: Uint8Array) : string {

    let hex = "";
    for (let i = 0; i < data.length; i++) {
        hex += data[i].toString(16);
    }
    return hex;
}

export function decode(hex: string) : Uint8Array {

    let data = new Uint8Array(hex.length >>> 1);
    for (let i = 0; i < hex.length >>> 1; ++i) {
        data.fill(i32(parseInt('0x' + hex.substr(i * 2, 2), 16)), i, i + 1);
    }
    return data;
}