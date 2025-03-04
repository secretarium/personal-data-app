// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Crypto, JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../config';
import { ApiOutcome, ApiResult } from '../../types';
import { InitiateRecoveryInput, ManageRecoveryFriendInput, RecoveringSession, RecoveringUser, RecoverUserInput, RecoverUserOutput, RecoveryConfig, RecoveryNotifToFriend } from './types';
import { User } from '../user/types';
import { checkEmailAddress } from '../email/helpers';
import { hexEncode } from '../../utils';
import { pushUserNotification } from '../push-notification/helpers';
import { PushNotificationArgs } from '../push-notification/types';
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
    let deviceBlob = Ledger.getTable(TBLE_NAMES.RECOVERING_USER).get(deviceId);
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
    user.deviceId = deviceId;
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
    if (!input.pushNotificationConfig || !input.pushNotificationConfig.token)
        return ApiResult.error<RecoverUserOutput>(`missing push notification config`);
    if (!input.pushNotificationConfig.encryptionKey || Base64.decode(input.pushNotificationConfig.encryptionKey).length != 16)
        return ApiResult.error<RecoverUserOutput>(`invalid push notification encryption key`);

    // Load recovering user
    const recoveringUser = RecoveringUser.getFromDevice(deviceId);
    if (!recoveringUser)
        return ApiResult.error<RecoverUserOutput>(`unkown device`);

    // Check if email is already used
    let userBlob = Ledger.getTable(TBLE_NAMES.USER_EMAIL).get(recoveringUser.email.value);
    if (userBlob.length == 0)
        return ApiResult.error<RecoverUserOutput>(`email is not recoverable`);

    // Validate email challenge
    let verificationResult = recoveringUser.email.verifyChallenge(utcNow, input.emailChallenge);
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
    session.userId = userToRecover.userId;
    session.time = utcNow;
    session.pushNotificationConfig = input.pushNotificationConfig;
    Ledger.getTable(TBLE_NAMES.RECOVERING_SESSION).set(deviceId, JSON.stringify<RecoveringSession>(session));

    // Remove recovering user
    Ledger.getTable(TBLE_NAMES.RECOVERING_USER).unset(deviceId);

    // Return
    return ApiResult.success<RecoverUserOutput>(output);
}

export function notifyRecoveryFriendsApi(deviceId: string): ApiOutcome {

    // Load recovering session
    const recoveringSessionBlob = Ledger.getTable(TBLE_NAMES.RECOVERING_SESSION).get(deviceId);
    if (recoveringSessionBlob.length == 0)
        return ApiResult.error<RecoverUserOutput>(`unkown device`);
    const recoveringSession = JSON.parse<RecoveringSession>(recoveringSessionBlob);

    // Load user to recover
    const userToRecover = User.getUser(recoveringSession.userId);
    if (!userToRecover)
        return ApiResult.error<RecoverUserOutput>(`unkown user`);

    // Load user recovery config
    const userRecovCfg = getUserRecoveryConfig(userToRecover.userId);
    if (userRecovCfg.recoveryFriends.size == 0)
        return ApiResult.error<RecoverUserOutput>(`recovery config is empty, can't recover`);

    // Notify friends
    let friendUserIds = userRecovCfg.recoveryFriends.values();
    for (let i = 0; i < friendUserIds.length; i++) {
        const friend = User.getUser(friendUserIds[i]);
        if (!friend)
            return ApiResult.error<RecoverUserOutput>(`unkown friend`);
        let notif = new RecoveryNotifToFriend();
        notif.email = userToRecover.email.value;
        let pushNotifArgs = new PushNotificationArgs("friendRecovery", notif);
        let pushNotifRes = pushUserNotification(friend.userId, pushNotifArgs);
        if (!pushNotifRes.success)
            return ApiResult.error<RecoverUserOutput>(`can't notify friend`);
    }

    // Return
    return ApiOutcome.success(`friends have been notified`);
}