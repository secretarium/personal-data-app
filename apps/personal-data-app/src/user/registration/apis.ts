// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Crypto, JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../../config';
import { ApiOutcome, ApiResult } from '../../../types';
import { PreRegisterUserInput, RegisterUserInput, RegisterOwnerInput, RegisteringUser, RegisterUserOutput } from './types';
import { checkEmailAddress } from '../../email/helpers';
import { UserChallengeableAttribute, UserData } from '../data/types';
import { hexEncode } from '../../../utils';
import { registerUser, verifyRegisterUserInputs } from './helpers';
import { MemberRole } from '../../administration/types';
import * as Base64 from "as-base64/assembly";


export function preRegisterUserApi(deviceId: string, utcNow: u64, input: PreRegisterUserInput): ApiOutcome {

    // Check and sanitise email address
    let emailCheck = checkEmailAddress(input.email);
    if (!emailCheck.success)
        return ApiOutcome.error(`invalid email address`);
    input.email = emailCheck.sanitisedEmail;

    // Check if email is already used
    let userBlob = Ledger.getTable(TBLE_NAMES.USER_EMAIL).get(input.email);
    if (userBlob.length != 0)
        return ApiOutcome.error(`email already registered`);

    // Check if device public key hash is already registered
    let deviceBlob = Ledger.getTable(TBLE_NAMES.REGISTERING_USER).get(deviceId);
    if (deviceBlob.length != 0)
        return ApiOutcome.error(`device already registered`);

    // Create an account for this user
    let user = new RegisteringUser();
    let userIdRnd = Crypto.getRandomValues(32);
    if (!userIdRnd || userIdRnd.length != 32)
        return ApiOutcome.error(`unavailable random generator`);
    user.userId = Base64.encode(userIdRnd);
    user.deviceId = deviceId;
    user.time = utcNow;
    user.email.value = input.email;
    let emailChallengeRnd = Crypto.getRandomValues(8);
    if (!emailChallengeRnd || emailChallengeRnd.length != 8)
        return ApiOutcome.error(`unavailable random generator`);
    let challengeHex = hexEncode(emailChallengeRnd);
    user.email.challenge = challengeHex.substring(0, 8).toUpperCase();
    Ledger.getTable(TBLE_NAMES.REGISTERING_USER).set(deviceId, JSON.stringify<RegisteringUser>(user));

    return ApiOutcome.success(`registration accepted`);
}

export function registerUserApi(deviceId: string, utcNow: u64, input: RegisterUserInput): ApiResult<RegisterUserOutput> {

    // Verify inputs
    let inputVerification = verifyRegisterUserInputs(input);
    if (!inputVerification.success)
        return ApiResult.from<RegisterUserOutput>(inputVerification);

    // Load registering user
    const registeringUser = RegisteringUser.getFromDevice(deviceId);
    if (!registeringUser)
        return ApiResult.error<RegisterUserOutput>(`unkown device`);

    // Check if email is already used
    let userBlob = Ledger.getTable(TBLE_NAMES.USER_EMAIL).get(registeringUser.email.value);
    if (userBlob.length != 0)
        return ApiResult.error<RegisterUserOutput>(`email already registered`);

    // Validate email challenge
    let verificationResult = registeringUser.email.verifyChallenge(utcNow, input.emailChallenge);

    // Return if failed attempt
    if (!verificationResult.success) {
        // Record the attempt
        Ledger.getTable(TBLE_NAMES.REGISTERING_USER).set(deviceId, JSON.stringify<RegisteringUser>(registeringUser));
        let output = new RegisterUserOutput();
        output.challengeState = verificationResult;
        return ApiResult.error<RegisterUserOutput>(`invalid code`, 0, output);
    }

    // Email is verified, we can create an account for this user
    let res = registerUser(registeringUser.userId, deviceId, registeringUser.email, input, utcNow);

    // Remove user from registering tables
    if (res.success)
        Ledger.getTable(TBLE_NAMES.REGISTERING_USER).unset(deviceId);

    return res;
}

export function registerOwnerApi(deviceId: string, utcNow: u64, input: RegisterOwnerInput): ApiResult<RegisterUserOutput> {

    // Check and sanitise email address
    let emailCheck = checkEmailAddress(input.email);
    if (!emailCheck.success)
        return ApiResult.error<RegisterUserOutput>(`invalid email address`);
    input.email = emailCheck.sanitisedEmail;

    // Check if owner is already set
    let value = Ledger.getTable(TBLE_NAMES.ADMIN).get("ADMINS");
    if (value.length != 0)
        return ApiResult.error<RegisterUserOutput>(`owner is already set`);

    // Create an account for the owner
    let userIdRnd = Crypto.getRandomValues(32);
    if (!userIdRnd || userIdRnd.length != 32)
        return ApiResult.error<RegisterUserOutput>(`unavailable random generator`);
    let userId = Base64.encode(userIdRnd);
    let email = new UserChallengeableAttribute();
    email.value = input.email;
    email.setVerified(utcNow); // Bypass email verification because smtp is not set yet
    let res = registerUser(userId, deviceId, email, input, utcNow);

    // Register as owner
    let list = new Map<string, MemberRole>();
    list.set(userId, { role: "owner", date: utcNow });
    Ledger.getTable(TBLE_NAMES.ADMIN).set("ADMINS", JSON.stringify<Map<string, MemberRole>>(list));

    return res;
}