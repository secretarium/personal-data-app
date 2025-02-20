// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Crypto, JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../../config';
import { ApiOutcome, ApiResult } from '../../../types';
import { InitialRegistrationInput, RegisteringUser, RegistrationInput, RegistrationOutput } from './types';
import { checkEmailAddress } from '../../email/helpers';
import { User } from '../types';
import { UserTOTP } from '../../totp/types';
import { UserPushNotificationConfig } from '../../push-notification/types';
import { UserData } from '../data/types';
import { UserDevice } from '../device/types';
import { hexEncode } from '../../../utils';
import * as Base64 from "as-base64/assembly";


export function initialRegistrationApi(deviceId: string, utcNow: u64, input: InitialRegistrationInput): ApiOutcome {

    // Check and sanitise email address
    let emailCheck = checkEmailAddress(input.email);
    if (!emailCheck.success)
        return ApiOutcome.Error(`invalid email address`);
    input.email = emailCheck.sanitisedEmail;

    // Check if email is already used
    let userBlob = Ledger.getTable(TBLE_NAMES.USER_EMAIL).get(input.email);
    if (userBlob.length != 0)
        return ApiOutcome.Error(`email already registered`);

    // Check if device public key hash is already registered
    let deviceBlob = Ledger.getTable(TBLE_NAMES.REGISTERING_USER).get(deviceId);
    if (deviceBlob.length != 0)
        return ApiOutcome.Error(`device already registered`);

    // Create an account for this user
    let user = new RegisteringUser();
    let userIdRnd = Crypto.getRandomValues(32);
    if (!userIdRnd || userIdRnd.length != 32)
        return ApiOutcome.Error(`unavailable random generator`);
    user.userId = Base64.encode(userIdRnd);
    user.deviceId = deviceId;
    user.time = utcNow;
    user.email.value = input.email;
    let emailChallengeRnd = Crypto.getRandomValues(8);
    if (!emailChallengeRnd || emailChallengeRnd.length != 8)
        return ApiOutcome.Error(`unavailable random generator`);
    let challengeHex = hexEncode(emailChallengeRnd);
    user.email.challenge = challengeHex.substring(0, 8).toUpperCase();
    Ledger.getTable(TBLE_NAMES.REGISTERING_USER).set(deviceId, JSON.stringify<RegisteringUser>(user));

    return ApiOutcome.Success(`registration accepted`);
}

export function registerApi(deviceId: string, utcNow: u64, input: RegistrationInput): ApiResult<RegistrationOutput> {

    // Verify inputs
    if (!input.deviceName)
        return ApiResult.Error<RegistrationOutput>(`missing device name`);
    if (!input.pushNotificationConfig || !input.pushNotificationConfig.token)
        return ApiResult.Error<RegistrationOutput>(`missing push notification config`);
    if (!input.pushNotificationConfig.encryptionKey || Base64.decode(input.pushNotificationConfig.encryptionKey).length != 16)
        return ApiResult.Error<RegistrationOutput>(`invalid push notification encryption key`);

    // Load registering user
    const registeringUser = RegisteringUser.getFromDevice(deviceId);
    if (!registeringUser)
        return ApiResult.Error<RegistrationOutput>(`unkown device`);

    // Check if email is already used
    let userBlob = Ledger.getTable(TBLE_NAMES.USER_EMAIL).get(registeringUser.email.value);
    if (userBlob.length != 0)
        return ApiResult.Error<RegistrationOutput>(`email already registered`);

    // Validate email challenge
    let verificationResult = registeringUser.email.verifyChallenge(utcNow, input.emailChallenge);

    // Return if failed attempt
    if (!verificationResult.success) {
        // Record the attempt
        Ledger.getTable(TBLE_NAMES.REGISTERING_USER).set(deviceId, JSON.stringify<RegisteringUser>(registeringUser));
        return ApiResult.Error<RegistrationOutput>(`invalid code`, { deviceId: null, seedTOTP: null, challengeState: verificationResult });
    }

    // Email is verified, we can create an account for this user
    let user = new User();
    user.userId = registeringUser.userId;
    user.deviceId = deviceId;
    user.email = registeringUser.email;
    Ledger.getTable(TBLE_NAMES.USER).set(user.userId, JSON.stringify<User>(user));
    Ledger.getTable(TBLE_NAMES.USER_EMAIL).set(user.email.value, user.userId); // alias

    // Remove user from registering tables
    Ledger.getTable(TBLE_NAMES.REGISTERING_USER).unset(deviceId);

    // Register TOTP config
    let seedTOTPRnd = Crypto.getRandomValues(32);
    if (!seedTOTPRnd || seedTOTPRnd.length != 32)
        return ApiResult.Error<RegistrationOutput>(`unavailable random generator`);

    let userTotp = new UserTOTP();
    userTotp.seed = Base64.encode(seedTOTPRnd);
    Ledger.getTable(TBLE_NAMES.USER_TOTP).set(user.userId, JSON.stringify<UserTOTP>(userTotp));

    // Register push notification config
    let userPushNotif = new UserPushNotificationConfig();
    userPushNotif.encryptionKey = input.pushNotificationConfig.encryptionKey;
    userPushNotif.token = input.pushNotificationConfig.token;
    Ledger.getTable(TBLE_NAMES.USER_PUSH_NOTIF).set(user.userId, JSON.stringify<UserPushNotificationConfig>(userPushNotif));

    // Register user data
    let userData = new UserData();
    userData.attributes.set("mainEmail", user.email.value);
    Ledger.getTable(TBLE_NAMES.USER_DATA).set(user.userId, JSON.stringify<UserData>(userData));

    // Register device
    let device = new UserDevice();
    device.publicKeyHash = deviceId;
    device.userId = user.userId;
    device.time = utcNow;
    device.name = input.deviceName;
    Ledger.getTable(TBLE_NAMES.DEVICE).set(deviceId, JSON.stringify<UserDevice>(device));
    Ledger.getTable(TBLE_NAMES.DEVICE_USER).set(deviceId, user.userId); // alias
    Ledger.getTable(TBLE_NAMES.USER_DEVICE).set(user.userId, deviceId); // alias

    // Return
    return ApiResult.Success<RegistrationOutput>({ deviceId: deviceId, seedTOTP: userTotp.seed, challengeState: null });
}