// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Context, Notifier, Ledger } from '@klave/sdk';
import { UserPushNotificationConfig, PushNotificationInput, PushNotificationServiceConfiguration,  } from './types';
import { User } from '../../types/user-data';
import { ErrorMessage } from '../../types';
import { TBLE_NAMES } from '../../config';
import { pushNotif } from './helpers';

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
    let userNotifConf = JSON.parse<UserPushNotificationConfig>(userNotifConfBytes);

    // Load push notification config
    let confBytes = Ledger.getTable(TBLE_NAMES.ADMIN).get("PUSH_NOTIF_CONFIG");
    if (confBytes.length != 0) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `push notification configuation is missing` });
        return;
    }
    let notifConf = JSON.parse<PushNotificationServiceConfiguration>(confBytes);

    // Push notification
    if (!pushNotif(notifConf, userNotifConf, input.message)) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `can't send push notification` });
        return;
    }

    Notifier.sendJson<ErrorMessage>({ success: true, message: `notification pushed` });
}
