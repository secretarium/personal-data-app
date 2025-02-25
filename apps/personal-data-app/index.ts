// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Context, Notifier, Transaction } from "@klave/sdk";
import { getUserInfoApi } from "./src/user/apis";
import { PushNotificationInput } from "./src/push-notification/types";
import { sendPushNotificationApi } from "./src/push-notification/apis";
import { PreRegisterUserInput, RegisterUserInput, RegisterOwnerInput } from "./src/user/registration/types";
import { preRegisterUserApi, registerUserApi, registerOwnerApi } from "./src/user/registration/apis";
import { emailChallengeApi } from "./src/email/apis";
import { ManageRecoveryFriendInput } from "./src/recovery/types";
import { manageRecoveryFriendApi } from "./src/recovery/apis";
import { AdministrateInput } from "./src/administration/types";
import { administrateApi } from "./src/administration/apis";
import { CreateTokenInput, VerifyTokenInput } from "./src/token/types";
import { createTokenApi, getTokenIdentityApi, verifyTokenApi } from "./src/token/apis";
import { AddDeviceInput, RemoveDeviceInput } from "./src/user/device/types";
import { addUserDeviceApi, getUserDevicesApi, removeUserDeviceApi } from "./src/user/device/apis";
import { ConfirmAuthSessionInput, RenewAuthSessionInput, RequestAuthSessionInput } from "./src/auth-session/types";
import { confirmAuthSessionApi, getAuthSessionApi, renewAuthSessionApi, requestAuthSessionApi } from "./src/auth-session/apis";


// USER APIs

/**
 * @query
 **/
export function me(): void {
    const result = getUserInfoApi(Context.get("sender"));
    Notifier.sendJson(result);
}


// REGISTRATION APIs

/**
 * @transaction
 * @param {PreRegisterUserInput} input - A parsed input argument
 */
export function preRegister(input: PreRegisterUserInput): void {
    const result = preRegisterUserApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    if (!result.success)
        Transaction.abort();
    Notifier.sendJson(result);
}

/**
 * @transaction
 * @param {RegisterUserInput} input - A parsed input argument
 */
export function register(input: RegisterUserInput): void {
    const result = registerUserApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    if (!result.success)
        Transaction.abort();
    Notifier.sendJson(result);
}

/**
 * @transaction
 * @param {RegisterOwnerInput} input - A parsed input argument
 */
export function registerOwner(input: RegisterOwnerInput): void {
    const result = registerOwnerApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    if (!result.success)
        Transaction.abort();
    Notifier.sendJson(result);
}

/**
 * @query
 **/
export function emailChallenge(): void {
    const result = emailChallengeApi(Context.get("sender"));
    Notifier.sendJson(result);
}


// RECOVERY APIs

/**
 * @transaction
 * @param {ManageRecoveryFriendInput} input - A parsed input argument
 */
export function manageRecoveryFriend(input: ManageRecoveryFriendInput): void {
    const result = manageRecoveryFriendApi(Context.get("sender"), input);
    if (!result.success)
        Transaction.abort();
    Notifier.sendJson(result);
}


// MANAGEMENT APIs

/**
 * @transaction
 * @param {AdministrateInput} input - A parsed input argument
 */
export function administrate(input: AdministrateInput): void {
    const result = administrateApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    if (!result.success)
        Transaction.abort();
    Notifier.sendJson(result);
}


// TOKEN APIs

/**
 * @query
 **/
export function getTokenIdentity(): void {
    const result = getTokenIdentityApi();
    Notifier.sendJson(result);
}

/**
 * @query
 * @param {VerifyTokenInput} input - A parsed input argument
 **/
export function verifyToken(input: VerifyTokenInput): void {
    const result = verifyTokenApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    Notifier.sendJson(result);
}

/**
 * @query
 * @param {CreateTokenInput} input - A parsed input argument
 **/
export function createToken(input: CreateTokenInput): void {
    const result = createTokenApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    Notifier.sendJson(result);
}


// AUTH SESSION

/**
 * @query
 **/
export function getAuthSession(): void {
    const result = getAuthSessionApi(Context.get("sender"), u64.parse(Context.get("trusted_time")));
    Notifier.sendJson(result);
}

/**
 * @transaction
 * @param {RequestAuthSessionInput} input - A parsed input argument
 **/
export function requestAuthSession(input: RequestAuthSessionInput): void {
    const result = requestAuthSessionApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    Notifier.sendJson(result);
}

/**
 * @transaction
 * @param {ConfirmAuthSessionInput} input - A parsed input argument
 **/
export function confirmAuthSession(input: ConfirmAuthSessionInput): void {
    const result = confirmAuthSessionApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    Notifier.sendJson(result);
}

/**
 * @transaction
 * @param {RenewAuthSessionInput} input - A parsed input argument
 **/
export function renewAuthSession(input: RenewAuthSessionInput): void {
    const result = renewAuthSessionApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    Notifier.sendJson(result);
}


// DEVICES APIs

/**
 * @query
 **/
export function getDevices(): void {
    const result = getUserDevicesApi(Context.get("sender"));
    Notifier.sendJson(result);
}

/**
 * @transaction
 * @param {AddDeviceInput} input - A parsed input argument
 */
export function addDevice(input: AddDeviceInput): void {
    const result = addUserDeviceApi(Context.get("sender"), u64.parse(Context.get("trusted_time")), input);
    if (!result.success)
        Transaction.abort();
    Notifier.sendJson(result);
}

/**
 * @transaction
 * @param {RemoveDeviceInput} input - A parsed input argument
 */
export function removeDevice(input: RemoveDeviceInput): void {
    const result = removeUserDeviceApi(Context.get("sender"), input);
    if (!result.success)
        Transaction.abort();
    Notifier.sendJson(result);
}


// TEST APIs

/**
 * @query
 **/
export function testPushNotification(input: PushNotificationInput): void {
    const result = sendPushNotificationApi(Context.get("sender"), input);
    Notifier.sendJson(result);
}


// DATA MIGRATION APIs