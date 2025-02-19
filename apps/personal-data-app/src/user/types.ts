// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from '@klave/sdk';
import { UserVerifiableAttribute } from './data/types';
import { TBLE_NAMES } from '../../config';


export enum UserAuthLevel {
    none, email, totp
}

@json
export class User {
    userId: string = ""; // base 64 encoded
    devicePublicKeyHash: string = ""; // base 64 encoded
    email: UserVerifiableAttribute = new UserVerifiableAttribute;

    static getUser(userId: string): User | null {

        let value = Ledger.getTable(TBLE_NAMES.USER).get(userId);
        if (value.length == 0)
            return null;

        return JSON.parse<User>(value);
    }

    static getUserFromDevice(devicePublicKeyHashB64: string): User | null {

        let value = Ledger.getTable(TBLE_NAMES.DEVICE_USER).get(devicePublicKeyHashB64);
        if (value.length == 0)
            return null;

        return this.getUser(value);
    }

    static getUserFromEmail(email: string): User | null {

        let value = Ledger.getTable(TBLE_NAMES.USER_EMAIL).get(email);
        if (value.length == 0)
            return null;

        return this.getUser(value);
    }

    getAuthLevel(): UserAuthLevel {

        let level: UserAuthLevel = UserAuthLevel.none;
        if (this.email.verified)
            level &= UserAuthLevel.email;
        if (this.email.verified)
            level &= UserAuthLevel.email;

        return level;
    }
}