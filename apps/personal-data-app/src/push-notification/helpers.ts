// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, HTTP, HttpRequest, Crypto, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../config';
import { UserPushNotificationConfig, ExpoPushNotificationObject, PushNotificationServiceConfiguration, PushNotificationArgs } from './types';
import { concatArrays } from '../../utils';
import { ApiOutcome } from '../../types';
import * as Base64 from "as-base64/assembly";

function pushNotif(config: PushNotificationServiceConfiguration, userCfg: UserPushNotificationConfig, msg: string): ApiOutcome {

    // Encrypt
    let aesKeyRes = Crypto.Subtle.importKey("raw", Base64.decode(userCfg.encryptionKey).buffer, {length: 128} as Crypto.AesKeyGenParams, true, ["encrypt", "decrypt"]);
    if (!aesKeyRes.data)
        return ApiOutcome.error(`invalid encryption key`);
    let aesKey = aesKeyRes.data as Crypto.CryptoKey;
    let iv = Crypto.getRandomValues(12);
    if (!iv)
        return ApiOutcome.error(`can't generate random`);
    let aesGcmParams = {iv : iv.buffer, additionalData : new ArrayBuffer(0), tagLength : 128} as Crypto.AesGcmParams;
    let encrypted = Crypto.Subtle.encrypt(aesGcmParams, aesKey, String.UTF8.encode(msg));
    if (!encrypted.data)
        return ApiOutcome.error(`can't encrypt the message`);
    let body = Base64.encode(concatArrays(iv!, Uint8Array.wrap(encrypted.data!)));

    // Call API
    const pushReq: HttpRequest = {
        hostname: 'notifier.secretarium.org',
        port: 443,
        path: '/push',
        method: 'POST',
        version: 'HTTP/1.1',
        headers: [
            ['Content-Type', 'application/json'],
            ['Accept', 'application/json'],
            ['Authorization', `Bearer ${config.bearerToken}`]
        ],
        body: JSON.stringify<ExpoPushNotificationObject>({ to: userCfg.token, body: body })
    };
    const pushResp = HTTP.request(pushReq);
    if (!pushResp || !pushResp.statusCode || pushResp.statusCode != 201)
        return ApiOutcome.error(`error while sending notification`);

    return ApiOutcome.success(`user device succesfully notified`);
}

export function pushUserNotification<T>(userId: string, message: PushNotificationArgs<T>) : ApiOutcome {

    // Load user push notification config
    let userNotifConfBytes = Ledger.getTable(TBLE_NAMES.USER_PUSH_NOTIF).get(userId);
    if (userNotifConfBytes.length == 0)
        return ApiOutcome.error(`user push notification configuation is missing`);
    let userNotifConf = JSON.parse<UserPushNotificationConfig>(userNotifConfBytes);

    // Load push notification config
    let confBytes = Ledger.getTable(TBLE_NAMES.ADMIN).get("PUSH_NOTIF_CONFIG");
    if (confBytes.length == 0)
        return ApiOutcome.error(`push notification configuation is missing`);
    let notifConf = JSON.parse<PushNotificationServiceConfiguration>(confBytes);

    // Push notification
    return pushNotif(notifConf, userNotifConf, JSON.stringify(message));
}