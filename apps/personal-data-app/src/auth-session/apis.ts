// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Crypto, JSON, Ledger, Subscription } from '@klave/sdk';
import { TBLE_NAMES } from '../../config';
import { ApiOutcome, ApiResult } from '../../types';
import { AuthSession, AuthSessionInternal, ConfirmAuthSessionInput, GetAuthSessionInput, StartAuthSessionInput } from './types';
import { User } from '../user/types';
import { pushUserNotification } from '../push-notification/helpers';
import { create } from '../token/helpers';
import * as Base64 from "as-base64/assembly";


export function getAuthSessionApi(utcNow: u64, input: GetAuthSessionInput): ApiResult<AuthSession> {

    // Checl input
    if (input.sessionId.length < 32)
        return ApiResult.Error<AuthSession>(`invalid argument "sessionId"`);

    // Start subscription
    Subscription.setReplayStart();
    let sessionBlob = Ledger.getTable(TBLE_NAMES.SESSION).get(input.sessionId);
    Subscription.setReplayStop();

    // Return new session if empty
    if (sessionBlob.length == 0)
        return ApiResult.Success(new AuthSession());

    // Prepare
    let session = JSON.parse<AuthSessionInternal>(sessionBlob).toAuthSession(utcNow);

    // Return
    return ApiResult.Success(session);
}

export function startAuthSessionApi(utcNow: u64, input: StartAuthSessionInput): ApiOutcome {

    // Check input
    if (input.vendorId.length < 5) // todo adjust but must be > 0
        return ApiOutcome.Error(`invalid argument "vendorId"`);

    // Load user from email // todo prevent spams with a bearer token
    const user = User.getUserFromEmail(input.email);
    if (!user)
        return ApiOutcome.Error(`unkown user`);

    // Start session
    let sessionIdBytes = Crypto.getRandomValues(32);
    if (!sessionIdBytes || sessionIdBytes.length != 32)
        return ApiOutcome.Error(`unavailable random generator`);
    let session = new AuthSessionInternal();
    session.id = Base64.encode(sessionIdBytes);
    session.userId = user.userId;
    session.vendorId = input.vendorId;
    session.lifespan = input.lifespan;
    session.status = "started";

    // Push notification to user device
    let pushNotifRes = pushUserNotification(user.userId, JSON.stringify(session.toAuthSession(utcNow)));
    if (!pushNotifRes.success)
        return pushNotifRes;

    // Update session
    Ledger.getTable(TBLE_NAMES.SESSION).set(session.id, JSON.stringify(session));

    // Return
    return ApiOutcome.Success(`session started`);
}

export function confirmAuthSessionApi(deviceId: string, utcNow: u64, input: ConfirmAuthSessionInput): ApiOutcome {

    // Load user
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiOutcome.Error(`unkown device`);

    // Load session
    let sessionBlob = Ledger.getTable(TBLE_NAMES.SESSION).get(input.sessionId);
    if (sessionBlob.length == 0)
        return ApiOutcome.Error(`unkown session`);
    let session = JSON.parse<AuthSessionInternal>(sessionBlob);

    // Update session
    session.token = "";
    if (!input.valid) // User can reject session
        session.status = "rejected";
    else if (session.time + session.lifespan < utcNow) // Check expiry
        session.status = "expired";
    else {
        session.status = "confirmed";
        let token = create(user.userId, session.vendorId, session.time, session.lifespan);
        if (!token.success)
            return ApiOutcome.Error(`can't generate session token`);
        session.token = token.result!;
    }
    Ledger.getTable(TBLE_NAMES.SESSION).set(session.id, JSON.stringify(session));

    // Return
    return ApiOutcome.Success(`session updated to status "${session.status}"`);
}