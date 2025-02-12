import { JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../config';
import { PushNotificationUserConfiguration } from '../types';
import { LIST_DISPOSABLE_EMAIL_DOMAINS } from './disposable-email-list';
import * as Base64 from "as-base64/assembly";

@json
export class UserVerifiableAttribute {
    value: string = "";
    challenge: string = "";
    attempts!: u64[];
    verified: bool = false;
    verifiers: string[] = [];
    lastVerificationTime: u64 = 0;
}

@json
export class User {
    userId!: Uint8Array;
    devicePublicKeyHash!: Uint8Array;
    seedTOTP!: Uint8Array;
    email!: UserVerifiableAttribute;
    pushNotifCfg!: PushNotificationUserConfiguration;

    static getUser(userId: Uint8Array): User | null {

        let value = Ledger.getTable(TBLE_NAMES.USER).get(String.UTF8.decode(userId.buffer));
        if (value.length == 0)
            return null;

        return JSON.parse<User>(value);
    }

    static getUserFromDevice(devicePublicKeyHashB64: string): User | null {

        let value = Ledger.getTable(TBLE_NAMES.DEVICE_USER).get(devicePublicKeyHashB64);
        if (value.length == 0)
            return null;

        return User.getUser(Uint8Array.wrap(String.UTF8.encode(value)));
    }

    static getUserFromEmail(email: string): User | null {

        let value = Ledger.getTable(TBLE_NAMES.USER_EMAIL).get(email);
        if (value.length == 0)
            return null;

        return User.getUser(Uint8Array.wrap(String.UTF8.encode(value)));
    }
}

@json
export class UserData {
    attributes!: Map<string, string>;
    verifiableAttributes!: Map<string, UserVerifiableAttribute>;
}

@json
export class UserDevice {
    name: string = "";
    publicKeyHash!: Uint8Array;
    userId!: Uint8Array;
    time: u64 = 0;
    attributes!: Map<string, string>;
}

@json
export class PushNotificationUserConfigurationInput {
    token!: string;
    encryptionKey!: string; // 16 bytes, base64 encoded
}

@json
export class UserRegisterInput {

    email!: string;
    deviceName!: string;
    pushNotificationConfig!: PushNotificationUserConfigurationInput

    verify(): bool {

        // Check input (no regexp in AS 😢)
        if (!this.email || this.email.length < 6 || this.email.includes(" ") || !this.email.includes("@"))
            return false;
        if (!this.deviceName)
            return false;
        if (!this.pushNotificationConfig || !this.pushNotificationConfig.token)
            return false;
        if (!this.pushNotificationConfig.encryptionKey || Base64.decode(this.pushNotificationConfig.encryptionKey).length != 16)
            return false;

        // Sanitise email
        const toSanitise= [ '<', '>', '"', '/', '\\', '=', '?', '#' ];
        for (let i = 0; i < toSanitise.length; i++) {
            this.email.replaceAll(toSanitise[i], "");
        }
        this.email.trim().toLowerCase();
        if (this.email.length < 6)
            return false;

        // Check email domain is not in the list of disposable email services
        let domain = this.email.split("@")[1];
        if (!domain || domain.length < 4)
            return false;
        if (LIST_DISPOSABLE_EMAIL_DOMAINS.includes(domain))
            return false;

        return true;
    }
}

@json
export class UserRegisterOutput {
    publicKeyHash!: string; // base 64 encoded
    seedTOTP!: string; // base 64 encoded
}