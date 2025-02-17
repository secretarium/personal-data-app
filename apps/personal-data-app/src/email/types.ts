// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

@json
export class EmailVerificationInput {
    code: string = "";
}

@json
export class EmailServiceConfiguration {
    applicationId!: string;
    clientSecret!: string;
}

@json
export class CheckEmailAddressOutput {
    success: bool = false;
    sanitisedEmail: string = "";
}

@json
export class MicrosoftAuthResponse {
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
export class MicrosoftEmailObject {
    message: MicrosoftEmailMessage = new MicrosoftEmailMessage();
    saveToSentItems: string = ""; // "true" | "false";
}