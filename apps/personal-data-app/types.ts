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
    bearerToken!: string;
}

@json
export class ManageAdminInput {
    email!: string;
    task!: string; // add-admin | remove-admin | add-owner | remove-owner
}

@json
export class PushNotificationUserConfiguration {
    token: string = "";
    encryptionKey: string = ""; // base 64 encoded
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
    pushNotificationConfig: PushNotificationConfiguration | null = null;
    manageAdmin: ManageAdminInput | null = null;
}