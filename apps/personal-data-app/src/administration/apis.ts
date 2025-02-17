// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Ledger, Context, JSON, Notifier, Crypto } from '@klave/sdk';
import { TBLE_NAMES } from '../../config';
import { AdministrateInput } from './types';
import { ErrorMessage } from '../../types';
import { addAdmin, addOwner, isAdmin, registerOwner, removeAdmin, removeOwner } from './helpers';
import { User } from '../../types/user-data';
import { EmailServiceConfiguration } from '../email/types';
import { PushNotificationServiceConfiguration } from '../push-notification/types';


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
        Ledger.getTable(TBLE_NAMES.ADMIN).set("EMAIL_CONFIG", JSON.stringify<EmailServiceConfiguration>(input.emailConfig!));
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
        Ledger.getTable(TBLE_NAMES.ADMIN).set("PUSH_NOTIF_CONFIG",
            JSON.stringify<PushNotificationServiceConfiguration>(input.pushNotificationConfig!));
    }
    else {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `invalid arg 'type'` });
        return;
    }
}