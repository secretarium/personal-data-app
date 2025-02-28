// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger, Subscription } from '@klave/sdk';
import { TBLE_NAMES } from '../../config';
import { ApiOutcome, ApiResult } from '../../types';
import { AuthSessionInternal, AuthSession, ConfirmAuthSessionInput, RequestAuthSessionInput, RenewAuthSessionInput } from './types';
import { User } from '../user/types';
import { create, verifySignature } from '../token/helpers';
import { pushUserNotification } from '../push-notification/helpers';


export function getAuthSessionApi(deviceId: string, utcNow: u64): ApiResult<AuthSession> {

    // Start subscription
    Subscription.setReplayStart();
    let sessionBlob = Ledger.getTable(TBLE_NAMES.SESSION).get(deviceId);
    Subscription.setReplayStop();

    // Return new session if empty
    if (sessionBlob.length == 0)
        return ApiResult.error<AuthSession>(`session not found`);

    // Parse
    let session = JSON.parse<AuthSessionInternal>(sessionBlob);

    // Check expiry
    if (session.time + session.lifespan < utcNow) {
        session.status = "expired";
        return ApiResult.error<AuthSession>(`session has expired`);
    }

    // Return if not confirmed
    if (session.status != "confirmed")
        return ApiResult.success(session.toAuthSession(utcNow));

    // Create token
    let token = create(session.userId, session.vendorId, session.time, session.lifespan);
    if (!token.success)
        return token.to<AuthSession>();

    // Return
    return ApiResult.success(session.toAuthSession(utcNow, token.result!));
}

export function requestAuthSessionApi(deviceId: string, utcNow: u64, input: RequestAuthSessionInput): ApiOutcome {

    // Check input
    if (input.vendorId.length < 5) // todo adjust but must be > 0
        return ApiOutcome.error(`invalid argument "vendorId"`);

    // Check deviceId is unkown (we expect an ephemereal one)
    let value = Ledger.getTable(TBLE_NAMES.DEVICE_USER).get(deviceId);
    if (value.length > 0)
        return ApiOutcome.error(`device is known`);

    // Start session
    let session = new AuthSessionInternal();
    session.time = utcNow;
    session.vendorId = input.vendorId;
    session.lifespan = input.lifespan;
    session.status = "requested";

    // Update session
    Ledger.getTable(TBLE_NAMES.SESSION).set(deviceId, JSON.stringify(session));

    // Return
    return ApiOutcome.success(`session requested`);
}

export function confirmAuthSessionApi(deviceId: string, utcNow: u64, input: ConfirmAuthSessionInput): ApiOutcome {

    // Load user
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiOutcome.error(`unkown device`);

    // Load session
    let sessionBlob = Ledger.getTable(TBLE_NAMES.SESSION).get(input.sessionId);
    if (sessionBlob.length == 0)
        return ApiOutcome.error(`unkown session`);
    let session = JSON.parse<AuthSessionInternal>(sessionBlob);

    // Update session
    if (!input.valid) // User can reject session
        session.status = "rejected";
    else if (session.time + session.lifespan < utcNow) // Check expiry
        session.status = "expired";
    else {
        session.status = "confirmed";
        session.userId = user.userId;
    }
    Ledger.getTable(TBLE_NAMES.SESSION).set(input.sessionId, JSON.stringify(session));

    // Return
    return ApiOutcome.success(`session updated to status '${session.status}'`);
}

export function renewAuthSessionApi(deviceId: string, utcNow: u64, input: RenewAuthSessionInput): ApiOutcome {

    // Verify Jwt
    let res = verifySignature(input.token);
    if (!res.success || !res.result)
        return res as ApiOutcome;

    // Check expiry
    if (!res.result!.exp)
        return ApiOutcome.error(`invalid token expiry`);

    // Load session
    let sessionBlob = Ledger.getTable(TBLE_NAMES.SESSION).get(deviceId);
    if (sessionBlob.length == 0)
        return ApiOutcome.error(`unkown session, can't renew`);
    let session = JSON.parse<AuthSessionInternal>(sessionBlob);
    let expired = res.result!.exp < utcNow;

    // Update session
    session.time = utcNow;
    session.lifespan = input.lifespan;
    session.status = expired ? "requested" : "confirmed";

    // If expired, we need to request a new authentication
    if (expired) {
        let pushNotifRes = pushUserNotification(session.userId, JSON.stringify(session.toAuthSession(utcNow)));
        if (!pushNotifRes.success)
            return pushNotifRes;
    }

    // Update session
    Ledger.getTable(TBLE_NAMES.SESSION).set(deviceId, JSON.stringify(session));

    // Return
    return ApiOutcome.success(`session updated to status '${session.status}'`);
}