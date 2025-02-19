// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON } from '@klave/sdk';


@json
export class Token {
    version: u32 = 0;
    nonce!: Uint8Array;
    userVendorId!: string;
}

@json
export class TokenJwtHead /* following the JWT standard */ {
    alg: string = "ES256";
    typ: string = "JWT";
}

@json
export class TokenJwtBody /* following the JWT standard */ {
    iss: string = "secretarium.id";
    sub: string = "JWT";
    iat: string = "JWT";
    auths!: string[];
}