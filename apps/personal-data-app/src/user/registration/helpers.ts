// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Crypto, JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../../config';
import { ApiOutcome, ApiResult } from '../../../types';
import { RegisterUserDeviceInput, RegisterUserInput, RegisterUserOutput } from './types';
import { User } from '../types';
import { UserTOTP } from '../../totp/types';
import { UserPushNotificationConfig } from '../../push-notification/types';
import { UserData, UserChallengeableAttribute } from '../data/types';
import { addUserDevice } from '../device/helpers';
import * as Base64 from "as-base64/assembly";


export function verifyRegisterUserInputs(input: RegisterUserInput): ApiOutcome {

    if (!input.deviceName)
        return ApiOutcome.error(`missing device name`);

    if (!input.emailChallenge)
        return ApiOutcome.error(`missing email challenge`);

    if (!input.pushNotificationConfig || !input.pushNotificationConfig.token)
        return ApiOutcome.error(`missing push notification config`);

    if (!input.pushNotificationConfig.encryptionKey || Base64.decode(input.pushNotificationConfig.encryptionKey).length != 16)
        return ApiOutcome.error(`invalid push notification encryption key`);

    return ApiOutcome.success();
}

export function registerUser(
    userId: string, deviceId: string, email: UserChallengeableAttribute,
    input: RegisterUserDeviceInput, utcNow: u64): ApiResult<RegisterUserOutput> {

    // Email is verified, we can create an account for this user
    let user = new User();
    user.userId = userId;
    user.deviceId = deviceId;
    user.email = email;
    Ledger.getTable(TBLE_NAMES.USER).set(user.userId, JSON.stringify<User>(user));
    Ledger.getTable(TBLE_NAMES.USER_EMAIL).set(user.email.value, user.userId); // alias

    // Register TOTP config
    let seedTOTPRnd = Crypto.getRandomValues(32);
    if (!seedTOTPRnd || seedTOTPRnd.length != 32)
        return ApiResult.error<RegisterUserOutput>(`unavailable random generator`);

    let userTotp = new UserTOTP();
    userTotp.seed = Base64.encode(seedTOTPRnd);
    Ledger.getTable(TBLE_NAMES.USER_TOTP).set(userId, JSON.stringify<UserTOTP>(userTotp));

    // Register push notification config
    Ledger.getTable(TBLE_NAMES.USER_PUSH_NOTIF).set(userId, JSON.stringify<UserPushNotificationConfig>(input.pushNotificationConfig));

    // Register user data
    let userData = new UserData();
    userData.verifiableAttributes.set("mainEmail", email);
    Ledger.getTable(TBLE_NAMES.USER_DATA).set(userId, JSON.stringify<UserData>(userData));

    // Register device
    if (!addUserDevice(userId, deviceId, utcNow, input))
        return ApiResult.error<RegisterUserOutput>(`can't register user device`);

    // Return
    return ApiResult.success<RegisterUserOutput>({ deviceId: deviceId, seedTOTP: userTotp.seed, challengeState: null });
}