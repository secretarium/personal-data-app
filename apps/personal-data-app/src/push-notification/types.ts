// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

@json
export class PushNotificationInput {
    message!: string;
    userEmail: string = "";
}

@json
export class PushNotificationServiceConfiguration {
    bearerToken!: string;
}

@json
export class UserPushNotificationConfig {
    token: string = "";
    encryptionKey: string = ""; // base 64 encoded
}

@json
export class ExpoPushNotificationObject {
    to!: string;
    body!: string;
}

@json
export class PushNotificationArgs<T> {
    constructor(public type: string, public args: T) {}
}