// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Crypto, JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../../config';
import { ApiOutcome, ApiResult } from '../../../types';
import { RegisterUserDeviceInput, RegisterUserOutput } from './types';
import { User } from '../types';
import { UserTOTP } from '../../totp/types';
import { UserPushNotificationConfig } from '../../push-notification/types';
import { UserData, UserVerifiableAttribute } from '../data/types';
import { UserDevice } from '../device/types';
import * as Base64 from "as-base64/assembly";


export function registerUser(
    userId: string, deviceId: string, email: UserVerifiableAttribute,
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
        return ApiResult.Error<RegisterUserOutput>(`unavailable random generator`);

    let userTotp = new UserTOTP();
    userTotp.seed = Base64.encode(seedTOTPRnd);
    Ledger.getTable(TBLE_NAMES.USER_TOTP).set(userId, JSON.stringify<UserTOTP>(userTotp));

    // Register push notification config
    let userPushNotif = new UserPushNotificationConfig();
    userPushNotif.encryptionKey = input.pushNotificationConfig.encryptionKey;
    userPushNotif.token = input.pushNotificationConfig.token;
    Ledger.getTable(TBLE_NAMES.USER_PUSH_NOTIF).set(userId, JSON.stringify<UserPushNotificationConfig>(userPushNotif));

    // Register user data
    let userData = new UserData();
    userData.attributes.set("mainEmail", email.value);
    Ledger.getTable(TBLE_NAMES.USER_DATA).set(userId, JSON.stringify<UserData>(userData));

    // Register device
    let device = new UserDevice();
    device.publicKeyHash = deviceId;
    device.userId = userId;
    device.time = utcNow;
    device.name = input.deviceName;
    Ledger.getTable(TBLE_NAMES.DEVICE).set(deviceId, JSON.stringify<UserDevice>(device));
    Ledger.getTable(TBLE_NAMES.DEVICE_USER).set(deviceId, userId); // alias
    Ledger.getTable(TBLE_NAMES.USER_DEVICES).set(userId, JSON.stringify<Array<string>>([deviceId])); // User devices

    // Return
    return ApiResult.Success<RegisterUserOutput>({ deviceId: deviceId, seedTOTP: userTotp.seed, challengeState: null });
}