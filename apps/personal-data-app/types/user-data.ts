import { JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../config';
import { LIST_DISPOSABLE_EMAIL_DOMAINS } from './disposable-email-list';
import * as Base64 from "as-base64/assembly";

export class ChallengeVerificationResult {
    success: bool = false;
    lockedUntil: u64 = 0; // Ns
    remainingAttemps: u32 = 0;
}

@json
export class UserVerifiableAttribute {
    value: string = "";
    challenge: string = "";
    attempts: Array<u64> = new Array<u64>();
    verified: bool = false;
    verifiers: Array<string> = new Array<string>();
    lastVerificationTime: u64 = 0;

    private getLockedUntil() : u64 {

        if (this.attempts.length <= 3)
            return 0;

        let lockedTime: u64 = 60 * 60 * 1000000000 * (
            this.attempts.length == 3 ? 3 :
            this.attempts.length == 4 ? 6 :
            this.attempts.length == 5 ? 12 :
            this.attempts.length == 6 ? 24 :
            this.attempts.length == 7 ? 48 : 72);

        return this.attempts[this.attempts.length - 1] + lockedTime;
    }

    verifyChallenge(nowUtcNs: u64, code: string) : ChallengeVerificationResult
    {
        let result = new ChallengeVerificationResult();

        // Check attempts state (if already beyond 3 attempts)
        if (this.attempts.length >= 3)
        {
            let lockedUntil = this.getLockedUntil();
            if (lockedUntil > nowUtcNs) {
                result.lockedUntil = lockedUntil;
                return result;
            }
        }

        // If challenge does not verify, we need to log the attempt
        if (this.challenge != code)
        {
            // Add attempt
            this.attempts.push(nowUtcNs);

            // Compute correct error message
            if (this.attempts.length >= 3) {
                result.lockedUntil = this.getLockedUntil();
            }
            else if(this.attempts.length == 2)
                result.remainingAttemps = 1;
            else
                result.remainingAttemps = 2;

            return result;
        }

        // Challenge did verify! Let's clean the attempts and add/update the attestation
        this.attempts = new Array<u64>(); // empty array
        this.lastVerificationTime = nowUtcNs;
        this.verified = true;
        this.verifiers.push("Secretarium");

        result.success = true;

        return result;
    }
}

export enum UserAuthLevel {
    none, email, totp
}

@json
export class User {
    userId: string = ""; // base 64 encoded
    devicePublicKeyHash: string = ""; // base 64 encoded
    email: UserVerifiableAttribute = new UserVerifiableAttribute;

    getAuthLevel(): UserAuthLevel {
        let level: UserAuthLevel = UserAuthLevel.none;
        if (this.email.verified)
            level &= UserAuthLevel.email;
        if (this.email.verified)
            level &= UserAuthLevel.email;

        return level;
    }

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
export class UserTOTP {
    seed: string = ""; // base 64 encoded
    attempts: Array<u64> = new Array<u64>();
    verified: bool = false;
    lastVerificationTime: u64 = 0;
}

@json
export class UserPushNotification {
    token: string = "";
    encryptionKey: string = ""; // base 64 encoded
}

@json
export class UserData {
    attributes: Map<string, string> = new Map<string, string>();
    verifiableAttributes: Map<string, UserVerifiableAttribute> = new Map<string, UserVerifiableAttribute>();
}

@json
export class UserDevice {
    name: string = "";
    publicKeyHash: string = ""; // base 64 encoded
    userId: string = ""; // base 64 encoded
    time: u64 = 0;
    attributes: Map<string, string> = new Map<string, string>();
}

@json
export class UserPushNotificationInput {
    token: string = "";
    encryptionKey: string = ""; // 16 bytes, base64 encoded
}

@json
export class UserRegisterInput {

    email: string = "";
    deviceName: string = "";
    pushNotificationConfig: UserPushNotificationInput = new UserPushNotificationInput();

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
    publicKeyHash: string = ""; // base 64 encoded
    seedTOTP: string = ""; // base 64 encoded
}