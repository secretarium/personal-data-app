// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Crypto } from '@klave/sdk';
import { ApiResult } from '../../types';
import { AuthTokenJwtHeader, AuthTokenJwtPayload } from './types';
import { base64Encode, concatArrays, toUrlMode } from '../../utils';
import * as Base64 from "as-base64/assembly";


export function computeUserVendorId(userId: string, vendorId: string) : string {

    let userVendorId = concatArrays(Base64.decode(userId), Uint8Array.wrap(String.UTF8.encode(vendorId)));
    let userVendorIdHash = Crypto.Subtle.digest("SHA2-256", userVendorId.buffer);
    return Base64.encode(Uint8Array.wrap(userVendorIdHash.data!));
}

export function verifySignature(jwtToken: string) : ApiResult<AuthTokenJwtPayload> {

    // Parse Jwt
    let jwtParts = jwtToken.split(".");
    if (jwtParts.length != 3)
        return ApiResult.Error<AuthTokenJwtPayload>(`invalid arguments`);

    // Verify header parameters are the ones we support
    let headerBytes = Base64.decode(jwtParts[0]);
    let header = JSON.parse<AuthTokenJwtHeader>(String.UTF8.decode(headerBytes.buffer));
    if (header.typ !== "JWT")
        return ApiResult.Error<AuthTokenJwtPayload>(`unsupported format`);
    if (header.alg !== "ES256")
        return ApiResult.Error<AuthTokenJwtPayload>(`unsupported algorithm`);

    // Load token identity
    let tokenKey = Crypto.Subtle.loadKey("auth-token-identity");
    if (!tokenKey.data)
        return ApiResult.Error<AuthTokenJwtPayload>(`can't load token identity`);

    // Verify signature
    let ecdsaParams = { hash: "SHA2-256" } as Crypto.EcdsaParams;
    let signature = Base64.decode(jwtParts[2]);
    let payloadBytes = Base64.decode(jwtParts[1]);
    let verify = Crypto.Subtle.verify(ecdsaParams, tokenKey.data!, payloadBytes.buffer, signature.buffer);
    if (!verify.data || !verify.data!.isValid)
        return ApiResult.Error<AuthTokenJwtPayload>(`invalid singature`);

    // Parse payload
    let payload = JSON.parse<AuthTokenJwtPayload>(String.UTF8.decode(payloadBytes.buffer));

    return ApiResult.Success<AuthTokenJwtPayload>(payload);
}

export function create(userId: string, vendorId: string, utcNow: u64, lifespan: u64 = 0) : ApiResult<string> {

    // Load token identity
    let tokenKey = Crypto.Subtle.loadKey("auth-token-identity");
    if (!tokenKey.data)
        return ApiResult.Error<string>(`can load token identity`);

    // Create header
    let header = new AuthTokenJwtHeader();
    let headerB64 = toUrlMode(base64Encode(header));

    // Create payload
    let payload = new AuthTokenJwtPayload();
    payload.iat = utcNow;
    payload.sub = computeUserVendorId(userId, vendorId);
    if (lifespan > 0)
        payload.exp = utcNow + lifespan;
    let payloadB64 = base64Encode(payload, true);

    // Sign
    let data = headerB64 + "." + payloadB64;
    let ecdsaParams = { hash: "SHA2-256" } as Crypto.EcdsaParams;
    let signature = Crypto.Subtle.sign(ecdsaParams, tokenKey.data!, String.UTF8.encode(data));
    if (!signature.data)
        return ApiResult.Error<string>(`can't sign the token`);

    return ApiResult.Success(data + "." + toUrlMode(Base64.encode(Uint8Array.wrap(signature.data!))));
}