// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Ledger, JSON } from '@klave/sdk';
import { sendEmail } from './helpers';
import { TBLE_NAMES } from '../../config';
import { EmailServiceConfiguration } from './types';
import { ApiOutcome } from '../../types';
import { UserChallengeableAttribute } from '../user/data/types';


export function challengeEmailApi(email: UserChallengeableAttribute): ApiOutcome {

    // Load email configuration
    let emailConfBytes = Ledger.getTable(TBLE_NAMES.ADMIN).get("EMAIL_CONFIG");
    if (emailConfBytes.length == 0)
        return ApiOutcome.error(`email server not configured`);
    let emailConf = JSON.parse<EmailServiceConfiguration>(emailConfBytes);

    // Load challenge email template
    let emailTemplate = Ledger.getTable(TBLE_NAMES.ADMIN).get("VERIFY_EMAIL_TEMPLATE");
    if (emailTemplate.length == 0)
        return ApiOutcome.error(`email template not configured`);

    // Email challenge
    emailTemplate = emailTemplate.replace("${challenge}", email.challenge);
    if (!sendEmail(emailConf, email.value, "Secretarium email verification", emailTemplate))
        return ApiOutcome.error(`can't send email`);

    return ApiOutcome.success(`email sent`);
}