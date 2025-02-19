// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Ledger, JSON } from '@klave/sdk';
import { sendEmail } from './helpers';
import { TBLE_NAMES } from '../../config';
import { EmailServiceConfiguration } from './types';
import { UserVerifiableAttribute } from '../user/data/types';
import { ApiOutcome } from '../../types';


export function emailChallengeApi(email: UserVerifiableAttribute): ApiOutcome {

    // Email challenge
    let emailConfBytes = Ledger.getTable(TBLE_NAMES.ADMIN).get("EMAIL_CONFIG");
    if (emailConfBytes.length != 0)
        return ApiOutcome.Error(`email server not configured`);

    let emailConf = JSON.parse<EmailServiceConfiguration>(emailConfBytes);
    let emailTemplate = Ledger.getTable(TBLE_NAMES.ADMIN).get("VERIFY_EMAIL_TEMPLATE");
    if (emailTemplate.length != 0)
        return ApiOutcome.Error(`email template not configured`);

    emailTemplate.replace("${challenge}", email.challenge);
    if (!sendEmail(emailConf, email.value, "Secretarium email verification", emailTemplate))
        return ApiOutcome.Error(`can't send email`);

    return ApiOutcome.Success(`email sent`);
}