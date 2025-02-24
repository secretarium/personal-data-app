// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../config';
import { UserChallengeableAttribute, UserVerifiableAttribute } from './data/types';
import { UserDevice } from './device/types';


@json
export class UserInfoOutput {
    email!: UserVerifiableAttribute;
    device!: UserDevice;
}

@json
export class User {
    userId: string = ""; // base 64 encoded
    deviceId: string = ""; // base 64 encoded
    email: UserChallengeableAttribute = new UserChallengeableAttribute;

    static getUser(userId: string): User | null {

        let value = Ledger.getTable(TBLE_NAMES.USER).get(userId);
        if (value.length == 0)
            return null;

        return JSON.parse<User>(value);
    }

    static getUserFromDevice(deviceId: string): User | null {

        let value = Ledger.getTable(TBLE_NAMES.DEVICE_USER).get(deviceId);
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
}