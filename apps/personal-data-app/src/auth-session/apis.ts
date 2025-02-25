// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger, Subscription } from '@klave/sdk';
import { TBLE_NAMES } from '../../config';
import { ApiOutcome, ApiResult } from '../../types';
import { AuthSessionInternal, AuthSessionStatus, ConfirmAuthSessionInput, RequestAuthSessionInput } from './types';
import { User } from '../user/types';
import { create } from '../token/helpers';


export function getAuthSessionStatusApi(deviceId: string, utcNow: u64): ApiResult<AuthSessionStatus> {

    // Start subscription
    Subscription.setReplayStart();
    let sessionBlob = Ledger.getTable(TBLE_NAMES.SESSION).get(deviceId);
    Subscription.setReplayStop();

    // Return new session if empty
    if (sessionBlob.length == 0)
        return ApiResult.Error<AuthSessionStatus>(`session not found`);

    // Prepare
    let session = JSON.parse<AuthSessionInternal>(sessionBlob).toAuthSessionStatus(utcNow);

    // Return
    return ApiResult.Success(session);
}

export function requestAuthSessionApi(deviceId: string, utcNow: u64, input: RequestAuthSessionInput): ApiOutcome {

    // Check input
    if (input.vendorId.length < 5) // todo adjust but must be > 0
        return ApiOutcome.Error(`invalid argument "vendorId"`);

    // Check deviceId is unkown (we expect an ephemereal one)
    let value = Ledger.getTable(TBLE_NAMES.DEVICE_USER).get(deviceId);
    if (value.length > 0)
        return ApiOutcome.Error(`device is known`);

    // Start session
    let session = new AuthSessionInternal();
    session.id = deviceId; // We use the device id as session id so that only this device can get the auth token
    session.time = utcNow;
    session.vendorId = input.vendorId;
    session.lifespan = input.lifespan;
    session.status = "requested";

    // Update session
    Ledger.getTable(TBLE_NAMES.SESSION).set(session.id, JSON.stringify(session));

    // Return
    return ApiOutcome.Success(`session requested`);
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
    if (!input.valid) // User can reject session
        session.status = "rejected";
    else if (session.time + session.lifespan < utcNow) // Check expiry
        session.status = "expired";
    else {
        session.status = "confirmed";
        session.userId = user.userId;
    }
    Ledger.getTable(TBLE_NAMES.SESSION).set(session.id, JSON.stringify(session));

    // Return
    return ApiOutcome.Success(`session updated to status "${session.status}"`);
}

export function getAuthSessionTokenApi(deviceId: string, utcNow: u64): ApiResult<string> {

    // Load session
    let sessionBlob = Ledger.getTable(TBLE_NAMES.SESSION).get(deviceId);
    if (sessionBlob.length == 0)
        return ApiResult.Error<string>(`unkown session`);
    let session = JSON.parse<AuthSessionInternal>(sessionBlob);

    // Remove it from ledger
    Ledger.getTable(TBLE_NAMES.SESSION).unset(session.id);

    // Check session
    if (session.time + session.lifespan < utcNow) { // Check expiry
        session.status = "expired";
        return ApiResult.Error<string>(`session has expired`);
    }
    if (session.status != "confirmed")
        return ApiResult.Error<string>(`session has not been confirmed yet`);

    // Generate token
    let token = create(session.userId, session.vendorId, session.time, session.lifespan);
    if (!token.success)
        return ApiResult.Error<string>(`can't generate session token`);

    // Return
    return ApiResult.Success(token.result!);
}