// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Crypto, JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../config';
import { ApiOutcome, ApiResult } from '../../types';
import { InitiateRecoveryInput, ManageRecoveryFriendInput, RecoveringFriendResponseInput, RecoveringSession, RecoveringUser, RecoverUserInput, RecoverUserOutput, RecoveryConfig, RecoveryNotifToFriend, RecoveryNotifyFriendsInput } from './types';
import { User } from '../user/types';
import { checkEmailAddress } from '../email/helpers';
import { hexEncode } from '../../utils';
import { pushUserNotification } from '../push-notification/helpers';
import { PushNotificationArgs, UserPushNotificationConfig } from '../push-notification/types';
import { addUserDevice, disableAllUserDevices } from '../user/device/helpers';
import { verifyRegisterUserInputs } from '../user/registration/helpers';
import * as Base64 from "as-base64/assembly";


function getUserRecoveryConfig(userId: string): RecoveryConfig {

    let value = Ledger.getTable(TBLE_NAMES.RECOVERY_CONFIG).get(userId);
    if (value.length == 0)
        return new RecoveryConfig();

    return JSON.parse<RecoveryConfig>(value);
}

export function manageRecoveryFriendApi(deviceId: string, input: ManageRecoveryFriendInput): ApiOutcome {

    // Check input
    if (input.operation != "add" && input.operation != "remove")
        return ApiOutcome.error(`invalid operation`);

    // Load user and user recovery config
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiOutcome.error(`unkown device`);
    const userRecovCfg = getUserRecoveryConfig(user.userId);

    // Load friend and friend recovery config
    const friend = User.getUserFromEmail(input.email);
    if (!friend)
        return ApiOutcome.error(`unkown friend`);
    const friendRecovCfg = getUserRecoveryConfig(friend.userId);

    // Update both configs
    if (input.operation == "add") {
        userRecovCfg.recoveryFriends.add(friend.userId);
        if (input.threshold <= 0 || input.threshold > userRecovCfg.recoveryFriends.size)
            return ApiOutcome.error(`invalid arguement`);
        userRecovCfg.friendVettingThreshold = input.threshold;
        friendRecovCfg.recoveryFriendOf.add(user.userId);
    }
    else {
        userRecovCfg.recoveryFriends.delete(friend.userId);
        if ((input.threshold <= 0 && userRecovCfg.recoveryFriends.size > 0) || input.threshold > userRecovCfg.recoveryFriends.size)
            return ApiOutcome.error(`invalid arguement`);
        userRecovCfg.friendVettingThreshold = input.threshold;
        friendRecovCfg.recoveryFriendOf.delete(user.userId);
    }

    // Save
    Ledger.getTable(TBLE_NAMES.RECOVERY_CONFIG).set(user.userId, JSON.stringify<RecoveryConfig>(userRecovCfg));
    Ledger.getTable(TBLE_NAMES.RECOVERY_CONFIG).set(friend.userId, JSON.stringify<RecoveryConfig>(friendRecovCfg));

    return ApiOutcome.success(`friend added`);
}

export function initiateRecoveryApi(deviceId: string, utcNow: u64, input: InitiateRecoveryInput): ApiOutcome {

    // Check and sanitise email address
    let emailCheck = checkEmailAddress(input.email);
    if (!emailCheck.success)
        return ApiOutcome.error(`invalid email address`);
    input.email = emailCheck.sanitisedEmail;

    // Check if email is already used
    let userBlob = Ledger.getTable(TBLE_NAMES.USER_EMAIL).get(input.email);
    if (userBlob.length == 0)
        return ApiOutcome.error(`email is not recoverable`);

    // Check if device public key hash is already registered
    let recoveringDevBlob = Ledger.getTable(TBLE_NAMES.RECOVERING_USER).get(deviceId);
    if (recoveringDevBlob.length != 0)
        return ApiOutcome.error(`recovery device already registered`);
    let deviceBlob = Ledger.getTable(TBLE_NAMES.DEVICE).get(deviceId);
    if (deviceBlob.length != 0)
        return ApiOutcome.error(`device already registered`);

    // Load user to recover
    const userToRecover = User.getUserFromEmail(input.email);
    if (!userToRecover)
        return ApiOutcome.error(`unkown user`);

    // Load user recovery config
    const userRecovCfg = getUserRecoveryConfig(userToRecover.userId);
    if (userRecovCfg.recoveryFriends.size == 0)
        return ApiOutcome.error(`recovery config is empty, can't recover`);

    // Create an account for this user
    let user = new RecoveringUser();
    let sessionIdRnd = Crypto.getRandomValues(32);
    if (!sessionIdRnd || sessionIdRnd.length != 32)
        return ApiOutcome.error(`unavailable random generator`);
    user.sessionId = Base64.encode(sessionIdRnd);
    user.time = utcNow;
    user.email.value = input.email;
    let emailChallengeRnd = Crypto.getRandomValues(8);
    if (!emailChallengeRnd || emailChallengeRnd.length != 8)
        return ApiOutcome.error(`unavailable random generator`);
    let challengeHex = hexEncode(emailChallengeRnd);
    user.email.challenge = challengeHex.substring(0, 8).toUpperCase();
    Ledger.getTable(TBLE_NAMES.RECOVERING_USER).set(deviceId, JSON.stringify<RecoveringUser>(user));

    return ApiOutcome.success(`recovery initiated`);
}

export function recoverUserApi(deviceId: string, utcNow: u64, input: RecoverUserInput): ApiResult<RecoverUserOutput> {

    // Verify inputs
    if (!input.sessionId || input.sessionId.length == 0)
        return ApiResult.error<RecoverUserOutput>(`missing session id`);
    let inputVerification = verifyRegisterUserInputs(input.registration);
    if (!inputVerification.success)
        return ApiResult.from<RecoverUserOutput>(inputVerification);

    // Load recovering user
    const recoveringUser = RecoveringUser.getFromDevice(deviceId);
    if (!recoveringUser)
        return ApiResult.error<RecoverUserOutput>(`unkown device`);

    // Validate email challenge
    let verificationResult = recoveringUser.email.verifyChallenge(utcNow, input.registration.emailChallenge);
    let output = new RecoverUserOutput();
    output.challengeState = verificationResult;

    // If the attempt failed, record the attempt
    if (!verificationResult.success) {
        Ledger.getTable(TBLE_NAMES.RECOVERING_USER).set(deviceId, JSON.stringify<RecoveringUser>(recoveringUser));
        return ApiResult.error<RecoverUserOutput>(`invalid code`, 0, output);
    }

    // Load user to recover
    const userToRecover = User.getUserFromEmail(recoveringUser.email.value);
    if (!userToRecover)
        return ApiResult.error<RecoverUserOutput>(`unkown user`);

    // Email is verified, we can create a session that will be used to monitor the responses of the user's friends
    let session = new RecoveringSession();
    session.sessionId = input.sessionId;
    session.userId = userToRecover.userId;
    session.deviceId = deviceId;
    session.time = utcNow;
    session.registration = input.registration;
    Ledger.getTable(TBLE_NAMES.RECOVERING_SESSION).set(input.sessionId, JSON.stringify<RecoveringSession>(session));

    // Remove recovering user
    Ledger.getTable(TBLE_NAMES.RECOVERING_USER).unset(deviceId);

    // Return
    return ApiResult.success<RecoverUserOutput>(output);
}

export function notifyRecoveryFriendsApi(deviceId: string, input: RecoveryNotifyFriendsInput): ApiOutcome {

    // Load recovering session
    const recoveringSessionBlob = Ledger.getTable(TBLE_NAMES.RECOVERING_SESSION).get(input.sessionId);
    if (recoveringSessionBlob.length == 0)
        return ApiOutcome.error(`unkown session`);
    const recoveringSession = JSON.parse<RecoveringSession>(recoveringSessionBlob);
    if (deviceId != recoveringSession.deviceId)
        return ApiOutcome.error(`unkown device`);

    // Load user to recover
    const userToRecover = User.getUser(recoveringSession.userId);
    if (!userToRecover)
        return ApiOutcome.error(`unkown user`);

    // Load user recovery config
    const userRecovCfg = getUserRecoveryConfig(userToRecover.userId);
    if (userRecovCfg.recoveryFriends.size == 0)
        return ApiOutcome.error(`recovery config is empty, can't recover`);

    // Notify friends
    let friendUserIds = userRecovCfg.recoveryFriends.values();
    for (let i = 0; i < friendUserIds.length; i++) {
        const friend = User.getUser(friendUserIds[i]);
        if (!friend)
            return ApiOutcome.error(`unkown friend`);
        let notif = new RecoveryNotifToFriend();
        notif.email = userToRecover.email.value;
        notif.sessionId = input.sessionId;
        let pushNotifArgs = new PushNotificationArgs("friendRecovery", notif);
        let pushNotifRes = pushUserNotification(friend.userId, pushNotifArgs);
        if (!pushNotifRes.success)
            return ApiOutcome.error(`can't notify friend`);
    }

    // Return
    return ApiOutcome.success(`friends have been notified`);
}

export function recoveringFriendResponseApi(deviceId: string, utcNow: u64, input: RecoveringFriendResponseInput): ApiOutcome {

    // Load friend
    const friend = User.getUserFromDevice(deviceId);
    if (!friend)
        return ApiOutcome.error(`unkown device`);

    // Load recovering session
    const sessionBlob = Ledger.getTable(TBLE_NAMES.RECOVERING_SESSION).get(input.sessionId);
    if (sessionBlob.length == 0)
        return ApiOutcome.error(`unkown session`);
    const session = JSON.parse<RecoveringSession>(sessionBlob);

    // Update session
    session.friendsResponses.set(friend.userId, input.approved);
    let counter = 0;
    let responses = session.friendsResponses.values();
    for (let i = 0; i < responses.length; i++) {
        if (responses[i])
            counter++;
    }
    Ledger.getTable(TBLE_NAMES.RECOVERING_SESSION).set(input.sessionId, JSON.stringify<RecoveringSession>(session));

    // Load user recovery config
    const recoveryCfgBlob = Ledger.getTable(TBLE_NAMES.RECOVERY_CONFIG).get(session.userId);
    if (recoveryCfgBlob.length == 0)
        return ApiOutcome.error(`unkown recovery config`);
    const recoveryCfg = JSON.parse<RecoveryConfig>(recoveryCfgBlob);

    // Check threshold
    if (counter < recoveryCfg.friendVettingThreshold)
        return ApiOutcome.success(`response registered`);

    // User has received sufficient positive responses from friends, we can restore the account
    const user = User.getUser(session.userId);
    if (!user)
        return ApiOutcome.error(`unkown user`);

    // Update user push notification config
    let userPushNotif = new UserPushNotificationConfig();
    userPushNotif.encryptionKey = session.registration.pushNotificationConfig.encryptionKey;
    userPushNotif.token = session.registration.pushNotificationConfig.token;
    Ledger.getTable(TBLE_NAMES.USER_PUSH_NOTIF).set(session.userId, JSON.stringify<UserPushNotificationConfig>(session.registration.pushNotificationConfig));

    // Update devices
    if (!disableAllUserDevices(user.userId))
        return ApiOutcome.error(`can't disable user devices`);
    if (!addUserDevice(user.userId, session.deviceId, utcNow, session.registration))
        return ApiOutcome.error(`can't register user device`);

    // Return
    return ApiOutcome.success(`response registered, account recovered`);
}