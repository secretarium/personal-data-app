// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { PushNotificationInput } from './types';
import { pushUserNotification } from './helpers';
import { User } from '../user/types';
import { ApiOutcome } from '../../types';


export function sendPushNotificationApi(deviceId: string, input: PushNotificationInput): ApiOutcome {

    // Load user
    const user = input.userEmail
        ? User.getUserFromEmail(input.userEmail)
        : User.getUserFromDevice(deviceId);
    if (!user)
        return ApiOutcome.error(`unkown device`);

    // Push notification
    return pushUserNotification(user.userId, input.message);
}