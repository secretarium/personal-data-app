// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Ledger, JSON } from '@klave/sdk';
import { sendEmail } from './helpers';
import { TBLE_NAMES } from '../../config';
import { EmailServiceConfiguration } from './types';
import { ApiOutcome } from '../../types';
import { RegisteringUser } from '../user/registration/types';


export function emailChallengeApi(deviceId: string): ApiOutcome {

    // Load registering user
    const registeringUser = RegisteringUser.getFromDevice(deviceId);
    if (!registeringUser)
        return ApiOutcome.Error(`unkown device`);

    // Load email configuration
    let emailConfBytes = Ledger.getTable(TBLE_NAMES.ADMIN).get("EMAIL_CONFIG");
    if (emailConfBytes.length == 0)
        return ApiOutcome.Error(`email server not configured`);
    let emailConf = JSON.parse<EmailServiceConfiguration>(emailConfBytes);

    // Load challenge email template
    let emailTemplate = Ledger.getTable(TBLE_NAMES.ADMIN).get("VERIFY_EMAIL_TEMPLATE");
    if (emailTemplate.length == 0)
        return ApiOutcome.Error(`email template not configured`);

    // Email challenge
    emailTemplate = emailTemplate.replace("${challenge}", registeringUser.email.challenge);
    if (!sendEmail(emailConf, registeringUser.email.value, "Secretarium email verification", emailTemplate))
        return ApiOutcome.Error(`can't send email`);

    return ApiOutcome.Success(`email sent`);
}