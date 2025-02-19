// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Context, Notifier } from "@klave/sdk";
import { User } from "./src/user/types";
import { ApiOutcome, ApiResult } from "./types";
import { PushNotificationInput } from "./src/push-notification/types";
import { sendPushNotificationApi } from "./src/push-notification/apis";
import { InitialRegistrationInput, RegistrationInput } from "./src/user/registration/types";
import { initialRegistrationApi, registerApi } from "./src/user/registration/apis";
import { UserVerifiableAttribute } from "./src/user/data/types";
import { emailChallengeApi } from "./src/email/apis";
import { ManageRecoveryFriendInput } from "./src/recovery/types";
import { manageRecoveryFriendApi } from "./src/recovery/apis";


/**
 * @query
 **/
export function me(): void {

    // Load user
    const user = User.getUserFromDevice(Context.get("sender"));
    if (!user) {
        Notifier.sendJson(ApiOutcome.Error(`unkown device`));
        return;
    }

    Notifier.sendJson(ApiResult.Success(user.email.value));
}

/**
 * @query
 **/
export function testPushNotification(input: PushNotificationInput): void {
    const result = sendPushNotificationApi(Context.get("sender"), input);
    Notifier.sendJson(result);
}

/**
 * @transaction
 * @param {InitialRegistrationInput} input - A parsed input argument
 */
export function initialRegistration(input: InitialRegistrationInput): void {
    const result = initialRegistrationApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    Notifier.sendJson(result);
}

/**
 * @transaction
 * @param {RegistrationInput} input - A parsed input argument
 */
export function register(input: RegistrationInput): void {
    const result = registerApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    Notifier.sendJson(result);
}

/**
 * @query
 **/
export function emailChallenge(email: UserVerifiableAttribute): void {
    const result = emailChallengeApi(email);
    Notifier.sendJson(result);
}

/**
 * @transaction
 * @param {ManageRecoveryFriendInput} input - A parsed input argument
 */
export function manageRecoveryFriend(input: ManageRecoveryFriendInput): void {
    const result = manageRecoveryFriendApi(Context.get("sender"), input);
    Notifier.sendJson(result);
}