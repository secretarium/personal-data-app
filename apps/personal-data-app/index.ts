import { Context, Notifier, Ledger, JSON, Crypto } from '@klave/sdk';
import { TBLE_NAMES } from './config';
import { ErrorMessage, AdministrateInput, EmailConfiguration, PushNotificationInput, PushNotificationConfiguration } from './types';
import { User, UserData, UserDevice, UserPushNotification, UserRegisterInput, UserRegisterOutput, UserTOTP } from './types/user-data';
import { isAdmin, addAdmin, removeAdmin, addOwner, removeOwner, registerOwner } from './utils/administration';
import { pushNotif } from './utils/push-notifications';
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

    Notifier.sendJson<User>(user);
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
    let userPushNotif = new UserPushNotification();
    userPushNotif.encryptionKey = input.pushNotificationConfig.encryptionKey;
    userPushNotif.token = input.pushNotificationConfig.token;
    Ledger.getTable(TBLE_NAMES.USER_PUSH_NOTIF).set(user.userId, JSON.stringify<UserPushNotification>(userPushNotif));

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

/**
 * @query
 **/
export function testPushNotification(input: PushNotificationInput): void {

    // Load user
    const user = input.userEmail
        ? User.getUserFromEmail(input.userEmail)
        : User.getUserFromDevice(Context.get("sender"));
    if (!user) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `unkown device` });
        return;
    }

    // Load user push notification config
    let userNotifConfBytes = Ledger.getTable(TBLE_NAMES.USER_PUSH_NOTIF).get("PUSH_NOTIF_CONFIG");
    if (userNotifConfBytes.length != 0) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `user push notification configuation is missing` });
        return;
    }
    let userNotifConf = JSON.parse<UserPushNotification>(userNotifConfBytes);

    // Load push notification config
    let confBytes = Ledger.getTable(TBLE_NAMES.ADMIN).get("PUSH_NOTIF_CONFIG");
    if (confBytes.length != 0) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `push notification configuation is missing` });
        return;
    }
    let notifConf = JSON.parse<PushNotificationConfiguration>(confBytes);

    // Push notification
    if (!pushNotif(notifConf, userNotifConf, input.message)) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `can't send push notification` });
        return;
    }

    Notifier.sendJson<ErrorMessage>({ success: true, message: `notification pushed` });
}

/**
 * @transaction
 * @param {AdministrateInput} input - A parsed input argument
 */
export function administrate(input: AdministrateInput): void {

    // Verify input
    if (!input || !input.type) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `incorrect arguments` });
        return;
    }

    // Verify access
    const user = User.getUserFromDevice(Context.get("sender"));
    if (!user) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `access denied` });
        return;
    }
    if (!isAdmin(user.userId) && input.type != "register-owner") {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `access denied` });
        return;
    }

    // Run sub command
    if (input.type == "register-owner") {

        if (!registerOwner(user.userId)) {
            Notifier.sendJson<ErrorMessage>({ success: false, message: `can't register owner` });
            return;
        }
    }
    else if (input.type == "manage-admin") {

        if (!input.manageAdmin || !input.manageAdmin!.email || !input.manageAdmin!.task) {
            Notifier.sendJson<ErrorMessage>({ success: false, message: `incorrect arguments` });
            return;
        }
        const userToManage = User.getUserFromEmail(input.manageAdmin!.email);
        if (!userToManage) {
            Notifier.sendJson<ErrorMessage>({ success: false, message: `user not found` });
            return;
        }
        if (input.manageAdmin!.task == "add-admin") {
            if (!addAdmin(user.userId, userToManage.userId)) {
                Notifier.sendJson<ErrorMessage>({ success: false, message: `can't add` });
                return;
            }
        }
        else if (input.manageAdmin!.task == "remove-admin") {
            if (!removeAdmin(user.userId, userToManage.userId)) {
                Notifier.sendJson<ErrorMessage>({ success: false, message: `can't remove` });
                return;
            }
        }
        else if (input.manageAdmin!.task == "add-owner") {
            if (!addOwner(user.userId, userToManage.userId)) {
                Notifier.sendJson<ErrorMessage>({ success: false, message: `can't add` });
                return;
            }
        }
        else if (input.manageAdmin!.task == "remove-owner") {
            if (!removeOwner(user.userId, userToManage.userId)) {
                Notifier.sendJson<ErrorMessage>({ success: false, message: `can't remove` });
                return;
            }
        }
        else {
            Notifier.sendJson<ErrorMessage>({ success: false, message: `incorrect arguments` });
            return;
        }
    }
    else if (input.type == "set-auth-token-identity") {

        let keypair = Crypto.Subtle.generateKey({namedCurve: "P-256"} as Crypto.EcKeyGenParams, false, ["sign", "verify"]);
        let res = Crypto.Subtle.saveKey(keypair.data, "auth-token-identity");
        if (res.err) {
            Notifier.sendJson<ErrorMessage>({ success: false, message: `can't save key, error: '${res.err!.message}'` });
            return;
        }
    }
    else if (input.type == "set-email-configuration") {

        if (!input.emailConfig) {
            Notifier.sendJson<ErrorMessage>({ success: false, message: `incorrect arguments` });
            return;
        }
        Ledger.getTable(TBLE_NAMES.ADMIN).set("EMAIL_CONFIG", JSON.stringify<EmailConfiguration>(input.emailConfig!));
    }
    else if (input.type == "set-verify-email-template") {

        if (!input.verifyEmailTemplate) {
            Notifier.sendJson<ErrorMessage>({ success: false, message: `incorrect arguments` });
            return;
        }
        Ledger.getTable(TBLE_NAMES.ADMIN).set("VERIFY_EMAIL_TEMPLATE", input.verifyEmailTemplate!);
    }
    else if (input.type == "set-push-notif-configuration") {

        if (!input.pushNotificationConfig) {
            Notifier.sendJson<ErrorMessage>({ success: false, message: `incorrect arguments` });
            return;
        }
        Ledger.getTable(TBLE_NAMES.ADMIN).set("PUSH_NOTIF_CONFIG", JSON.stringify<PushNotificationConfiguration>(input.pushNotificationConfig!));
    }
    else {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `invalid arg 'type'` });
        return;
    }
}