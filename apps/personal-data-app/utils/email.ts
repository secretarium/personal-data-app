import { Context, Notifier, Ledger, JSON, HTTP, HttpRequest } from '@klave/sdk';
import { ChallengeVerificationResult, User, UserData, UserDevice, UserRegisterInput, UserRegisterOutput } from '../types/user-data';
import { TBLE_NAMES } from '../config';
import { ErrorMessage, EmailConfiguration } from '../types';

@json
class MicrosoftAuthResponse {
    @alias("access_token")
    accessToken: string = "";
}

@json
class MicrosoftEmailBody {
    contentType: string = ""; // "Text" | "HTML";
    content: string = "";
}

@json
class MicrosoftEmailAddress {
    address: string = "";
}

@json
class MicrosoftEmailRecipients {
    emailAddress: MicrosoftEmailAddress = new MicrosoftEmailAddress();
}

@json
class MicrosoftEmailMessage {
    subject: string = "";
    body: MicrosoftEmailBody = new MicrosoftEmailBody();
    toRecipients: Array<MicrosoftEmailRecipients> = new Array<MicrosoftEmailRecipients>();
}

@json
class MicrosoftEmailObject {
    message: MicrosoftEmailMessage = new MicrosoftEmailMessage();
    saveToSentItems: string = ""; // "true" | "false";
}

@json
class EmailVerificationInput {
    code: string = "";
}

export function sendEmail(config: EmailConfiguration, address: string, subject: string, content: string): bool {

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
    let emailConf = JSON.parse<EmailConfiguration>(emailConfBytes);
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