import { JSON } from '@klave/sdk';

@json
export class ErrorMessage {
    success!: boolean;
    message!: string;
}

@json
export class EmailConfiguration {
    applicationId!: string;
    clientSecret!: string;
}

@json
export class PushNotificationConfiguration {
    token!: string;
    encryptionKey!: Uint8Array;
}

@json
export class PushNotificationInput {
    message!: string;
    userEmail: string = "";
}

@json
export class AdministrateInput {
    type!: string;
    emailConfig: EmailConfiguration | null = null;
    verifyEmailTemplate: string | null = null;
}