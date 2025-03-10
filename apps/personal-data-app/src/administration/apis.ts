// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Ledger, JSON, Crypto } from '@klave/sdk';
import { TBLE_NAMES } from '../../config';
import { AdministrateInput } from './types';
import { addAdmin, addOwner, isAdmin, manageEmailDisposableList, removeAdmin, removeOwner } from './helpers';
import { EmailServiceConfiguration } from '../email/types';
import { PushNotificationServiceConfiguration } from '../push-notification/types';
import { ApiOutcome } from '../../types';
import { User } from '../user/types';


export function administrateApi(deviceId: string, utcNow: u64, input: AdministrateInput): ApiOutcome {

    // Verify input
    if (!input || !input.type)
        return ApiOutcome.error(`incorrect arguments`);

    // Verify access
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiOutcome.error(`access denied`);
    if (!isAdmin(user.userId))
        return ApiOutcome.error(`access denied`);

    // Run sub command
    if (input.type == "manage-admin") {

        if (!input.manageAdmin || !input.manageAdmin!.email || !input.manageAdmin!.task)
            return ApiOutcome.error(`incorrect arguments`);

        const userToManage = User.getUserFromEmail(input.manageAdmin!.email);
        if (!userToManage)
            return ApiOutcome.error(`user not found`);

        if (input.manageAdmin!.task == "add-admin") {
            if (!addAdmin(user.userId, userToManage.userId, utcNow))
                return ApiOutcome.error(`can't add`);
        }
        else if (input.manageAdmin!.task == "remove-admin") {
            if (!removeAdmin(user.userId, userToManage.userId, utcNow))
                return ApiOutcome.error(`can't remove`);
        }
        else if (input.manageAdmin!.task == "add-owner") {
            if (!addOwner(user.userId, userToManage.userId, utcNow))
                return ApiOutcome.error(`can't add`);
        }
        else if (input.manageAdmin!.task == "remove-owner") {
            if (!removeOwner(user.userId, userToManage.userId, utcNow))
                return ApiOutcome.error(`can't remove`);
        }
        else
            return ApiOutcome.error(`incorrect arguments`);
    }
    else if (input.type == "set-auth-token-identity") {

        let keypair = Crypto.Subtle.generateKey({namedCurve: "P-256"} as Crypto.EcKeyGenParams, true, ["sign"]);
        if (!keypair.data)
            return ApiOutcome.error(`can't create key, error: '${keypair.err!.message}'`);
        let res = Crypto.Subtle.saveKey(keypair.data, "auth-token-identity");
        if (res.err)
            return ApiOutcome.error(`can't save key, error: '${res.err!.message}'`);
    }
    else if (input.type == "set-email-configuration") {

        if (!input.emailConfig)
            return ApiOutcome.error(`incorrect arguments`);

        Ledger.getTable(TBLE_NAMES.ADMIN).set("EMAIL_CONFIG", JSON.stringify<EmailServiceConfiguration>(input.emailConfig!));
    }
    else if (input.type == "set-verify-email-template") {

        if (!input.verifyEmailTemplate)
            return ApiOutcome.error(`incorrect arguments`);

        Ledger.getTable(TBLE_NAMES.ADMIN).set("VERIFY_EMAIL_TEMPLATE", input.verifyEmailTemplate!);
    }
    else if (input.type == "set-push-notif-configuration") {

        if (!input.pushNotificationConfig)
            return ApiOutcome.error(`incorrect arguments`);

        Ledger.getTable(TBLE_NAMES.ADMIN).set("PUSH_NOTIF_CONFIG",
            JSON.stringify<PushNotificationServiceConfiguration>(input.pushNotificationConfig!));
    }
    else if (input.type == "manage-disposable-email-domains") {

        if (!input.manageDisposableEmailList || !input.manageDisposableEmailList!.emails || !input.manageDisposableEmailList!.task)
            return ApiOutcome.error(`incorrect arguments`);
        if (input.manageDisposableEmailList!.task != "add" && input.manageDisposableEmailList!.task != "remove")
            return ApiOutcome.error(`incorrect arguments`);

        manageEmailDisposableList(input.manageDisposableEmailList!.emails, input.manageDisposableEmailList!.task);
    }
    else
        return ApiOutcome.error(`invalid arg 'type'`);

    return ApiOutcome.success(`update done`);
}