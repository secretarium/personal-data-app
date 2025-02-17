// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Context, Notifier, Ledger, JSON } from '@klave/sdk';
import { ChallengeVerificationResult, User } from '../../types/user-data';
import { ErrorMessage } from '../../types';
import { sendEmail } from './helpers';
import { TBLE_NAMES } from '../../config';
import { EmailServiceConfiguration, EmailVerificationInput } from './types';

/**
 * @query
 **/
export function emailChallenge(): void {

    // Load user
    const user = User.getUserFromDevice(Context.get("sender"));
    if (!user) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `unkown device` });
        return;
    }

    // Email challenge
    let emailConfBytes = Ledger.getTable(TBLE_NAMES.ADMIN).get("EMAIL_CONFIG");
    if (emailConfBytes.length != 0) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `email server not configured` });
        return;
    }
    let emailConf = JSON.parse<EmailServiceConfiguration>(emailConfBytes);
    let emailTemplate = Ledger.getTable(TBLE_NAMES.ADMIN).get("VERIFY_EMAIL_TEMPLATE");
    if (emailTemplate.length != 0) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `email template not configured` });
        return;
    }
    emailTemplate.replace("${challenge}", user.email.challenge);
    if (!sendEmail(emailConf, user.email.value, "Secretarium email verification", emailTemplate)) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `can't send email` });
        return;
    }

    Notifier.sendJson<ErrorMessage>({ success: true, message: `email sent` });
}

/**
 * @transaction
 * @param {UserRegisterInput} input - A parsed input argument
 */
export function verifyEmailChallenge(input: EmailVerificationInput): void {

    // Load user
    const user = User.getUserFromDevice(Context.get("sender"));
    if (!user) {
        Notifier.sendJson<ErrorMessage>({ success: false, message: `unkown device` });
        return;
    }

    // Test value
    let utcNow = u64.parse(Context.get("trusted_time"));
    let verificationResult = user.email.verifyChallenge(utcNow, input.code);

    // Save outcome
    Ledger.getTable(TBLE_NAMES.USER).set(user.userId, JSON.stringify<User>(user));

    // Return
    Notifier.sendJson<ChallengeVerificationResult>(verificationResult);
}