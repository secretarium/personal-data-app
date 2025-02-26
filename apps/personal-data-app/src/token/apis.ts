// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Crypto } from '@klave/sdk';
import { ApiOutcome, ApiResult } from '../../types';
import { CreateTokenInput, GetTokenIdentityInput, VerifyTokenInput } from './types';
import { computeUserVendorId, create, verifySignature } from './helpers';
import { User } from '../user/types';
import * as Base64 from "as-base64/assembly";


export function getTokenIdentityApi(input: GetTokenIdentityInput): ApiOutcome {

    // Load token identity
    let tokenKey = Crypto.Subtle.loadKey("auth-token-identity");
    if (!tokenKey.data)
        return ApiOutcome.Error(`can load token identity, error: '${tokenKey.err!.message}'`);

    // Get public key
    let pubKey = Crypto.Subtle.getPublicKey(tokenKey.data);
    if (!pubKey.data)
        return ApiOutcome.Error(`can get token identity public key, error: '${pubKey.err!.message}'`);

    // Export public key
    let expKey = Crypto.Subtle.exportKey(input.format, pubKey.data);
    if (!expKey.data)
        return ApiOutcome.Error(`can export the token identity public key, error: '${expKey.err!.message}'`);

    return ApiOutcome.Success(Base64.encode(Uint8Array.wrap(expKey.data!)));
}

export function verifyTokenApi(deviceId: string, utcNow: u64, input: VerifyTokenInput): ApiOutcome {

    // Load user
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiOutcome.Error(`access denied`);

    // Verify token signature
    let res = verifySignature(input.token);
    if (!res.success)
        return ApiOutcome.Error(res.message);

    // Check if expired
    if (utcNow > res.result!.exp)
        return ApiOutcome.Error(`token has expired`);

    // Verify vendor id
    let expectedUserVendorId = computeUserVendorId(user.userId, input.vendorId);
    if (expectedUserVendorId != res.result!.sub)
        return ApiOutcome.Error(`incorrect vendor id`);

    return ApiOutcome.Success(`token is valid`);
}

export function createTokenApi(deviceId: string, utcNow: u64, input: CreateTokenInput): ApiResult<string> {

    // Load user
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiResult.Error<string>(`access denied`);

    // Create token
    return create(user.userId, input.vendorId, utcNow, input.lifespan);
}