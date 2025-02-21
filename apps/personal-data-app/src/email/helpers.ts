// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, HTTP, HttpRequest, Ledger } from '@klave/sdk';
import { CheckEmailAddressOutput, EmailServiceConfiguration, MicrosoftAuthResponse, MicrosoftEmailObject } from './types';
import { TBLE_NAMES } from '../../config';

export function sendEmail(config: EmailServiceConfiguration, address: string, subject: string, content: string): bool {

    const applicationId = config.applicationId;
    const clientSecret = encodeURIComponent(config.clientSecret);

    // Query auth token
    // todo: token is valid of 3600 seconds (1h) so we could cache it and request on demand only if expired
    const authQuery: HttpRequest = {
        hostname: 'login.microsoftonline.com',
        port: 443,
        path: '/secretarium.com/oauth2/v2.0/token',
        method: 'POST',
        version: 'HTTP/1.1',
        headers: [['Content-Type', 'application/x-www-form-urlencoded']],
        body: `client_id=${applicationId}&scope=https://graph.microsoft.com/.default&client_secret=${clientSecret}&grant_type=client_credentials`
    };
    const authResponse = HTTP.request(authQuery);
    if (!authResponse || !authResponse.body)
        return false;
    const authResp = JSON.parse<MicrosoftAuthResponse>(authResponse.body);
    if (!authResp || !authResp.accessToken)
        return false;

    // Send email
    const emailObj : MicrosoftEmailObject = {
        message: {
            subject: subject,
            body: { contentType: 'Text', content: content },
            toRecipients: [ { emailAddress: { address: address } } ],
        },
        saveToSentItems: 'false'
    };
    const emailQuery: HttpRequest = {
        hostname: 'graph.microsoft.com',
        port: 443,
        path: '/v1.0/users/no-reply@secretarium.org/sendMail',
        method: 'POST',
        version: 'HTTP/1.1',
        headers: [['Content-Type', 'application/json'], ['Authorization', `Bearer ${authResp.accessToken}`]],
        body: JSON.stringify<MicrosoftEmailObject>(emailObj)
    };
    const emailResponse = HTTP.request(emailQuery);
    if (!emailResponse || !emailResponse.statusCode)
        return false;

    return emailResponse.statusCode == 202;
}

export function checkEmailAddress(email: string) : CheckEmailAddressOutput {

    let res = new CheckEmailAddressOutput();
    res.success = false;
    res.sanitisedEmail = "";

    // Check input (no regexp in AS 😢)
    if (!email || email.length < 6 || email.includes(" ") || !email.includes("@"))
        return res;

    // Sanitise email
    const toSanitise= [ '<', '>', '"', '/', '\\', '=', '?', '#' ];
    for (let i = 0; i < toSanitise.length; i++) {
        email.replaceAll(toSanitise[i], "");
    }
    email.trim().toLowerCase();
    if (email.length < 6)
        return res;

    // Get domain
    let split = email.split("@");
    if (split.length != 2)
        return res;
    let domain = split[1];
    if (!domain || domain.length < 4)
        return res;

    // Check email domain is not in the list of disposable email services
    let disposableEmailDomainsBytes = Ledger.getTable(TBLE_NAMES.BLACKLIST).get("DISPOSABLE_EMAIL_DOMAINS");
    if (disposableEmailDomainsBytes.length == 0)
        return res;
    let disposableEmailDomains = JSON.parse<Set<string>>(disposableEmailDomainsBytes);
    if (disposableEmailDomains.has(domain))
        return res;

    // Return
    res.success = true;
    res.sanitisedEmail = email;
    return res;
}