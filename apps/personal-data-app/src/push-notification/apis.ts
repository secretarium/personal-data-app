// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from '@klave/sdk';
import { UserPushNotificationConfig, PushNotificationInput, PushNotificationServiceConfiguration,  } from './types';
import { TBLE_NAMES } from '../../config';
import { pushNotif } from './helpers';
import { User } from '../user/types';
import { ApiOutcome } from '../../types';


export function sendPushNotificationApi(devicePublicKeyHashB64: string, input: PushNotificationInput): ApiOutcome {

    // Load user
    const user = input.userEmail
        ? User.getUserFromEmail(input.userEmail)
        : User.getUserFromDevice(devicePublicKeyHashB64);
    if (!user)
        return ApiOutcome.Error(`unkown device`);

    // Load user push notification config
    let userNotifConfBytes = Ledger.getTable(TBLE_NAMES.USER_PUSH_NOTIF).get("PUSH_NOTIF_CONFIG");
    if (userNotifConfBytes.length != 0)
        return ApiOutcome.Error(`user push notification configuation is missing`);
    let userNotifConf = JSON.parse<UserPushNotificationConfig>(userNotifConfBytes);

    // Load push notification config
    let confBytes = Ledger.getTable(TBLE_NAMES.ADMIN).get("PUSH_NOTIF_CONFIG");
    if (confBytes.length != 0)
        return ApiOutcome.Error(`push notification configuation is missing`);
    let notifConf = JSON.parse<PushNotificationServiceConfiguration>(confBytes);

    // Push notification
    if (!pushNotif(notifConf, userNotifConf, input.message))
        return ApiOutcome.Error(`can't send push notification`);

    return ApiOutcome.Success(`notification pushed`);
}