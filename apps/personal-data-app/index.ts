// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Context, Notifier, Ledger, JSON, Crypto } from '@klave/sdk';
import { TBLE_NAMES } from './config';
import { ErrorMessage } from './types';
import { User, UserData, UserDevice, UserRegisterInput, UserRegisterOutput, UserTOTP } from './types/user-data';
import { UserPushNotificationConfig } from './src/push-notification/types';
import * as Base64 from "as-base64/assembly";
import * as Hex from "./utils/hex-encoder";


/**
 * @query
 **/
export function me(): void {

    // Load user
    const user = User.getUserFromDevice(Context.get("sender"));
    if (!user) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `unkown device` });
        return;
    }

    Notifier.sendJson<string>(user.email.value);
}

/**
 * @transaction
 * @param {UserRegisterInput} input - A parsed input argument
 */
export function register(input: UserRegisterInput): void {

    // Sanitise and verify email address
    if (!input.verify()) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `incorrect arguments` });
        return;
    }

    // Check is email is already used
    let value = Ledger.getTable(TBLE_NAMES.USER_EMAIL).get(input.email);
    if (value.length != 0) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `email already registered` });
        return;
    }

    // Create an account for this user
    let user = new User();
    let userIdRnd = Crypto.getRandomValues(32);
    if (!userIdRnd || userIdRnd.length != 32) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `unavailable random generator` });
        return;
    }
    user.userId = Base64.encode(userIdRnd);
    let devicePublicKeyHashB64 = Context.get("sender");
    user.devicePublicKeyHash = devicePublicKeyHashB64;
    user.email.value = input.email;
    let emailChallengeRnd = Crypto.getRandomValues(8);
    if (!emailChallengeRnd || emailChallengeRnd.length != 8) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `unavailable random generator` });
        return;
    }
    let challengeHex = Hex.encode(emailChallengeRnd);
    user.email.challenge = challengeHex.substring(0, 8).toUpperCase();
    Ledger.getTable(TBLE_NAMES.USER).set(user.userId, JSON.stringify<User>(user));
    Ledger.getTable(TBLE_NAMES.USER_EMAIL).set(input.email, user.userId); // alias

    // Register TOTP config
    let seedTOTPRnd = Crypto.getRandomValues(32);
    if (!seedTOTPRnd || seedTOTPRnd.length != 32) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `unavailable random generator` });
        return;
    }
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
    userData.attributes.set("mainEmail", input.email);
    Ledger.getTable(TBLE_NAMES.USER_DATA).set(user.userId, JSON.stringify<UserData>(userData));

    // Register device
    let device = new UserDevice();
    device.publicKeyHash = user.devicePublicKeyHash;
    device.userId = user.userId;
    device.time = u64.parse(Context.get("trusted_time"));
    device.name = input.deviceName;
    Ledger.getTable(TBLE_NAMES.DEVICE).set(devicePublicKeyHashB64, JSON.stringify<UserDevice>(device));
    Ledger.getTable(TBLE_NAMES.DEVICE_USER).set(devicePublicKeyHashB64, user.userId); // alias
    Ledger.getTable(TBLE_NAMES.USER_DEVICE).set(user.userId, devicePublicKeyHashB64); // alias

    // Return
    Notifier.sendJson<UserRegisterOutput>({ publicKeyHash: devicePublicKeyHashB64, seedTOTP: userTotp.seed});
}
