// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../../config';
import { ChallengeVerificationResult, UserVerifiableAttribute } from '../data/types';
import { UserPushNotificationConfig } from '../../push-notification/types';


@json
export class InitialRegistrationInput {
    email: string = "";
}

@json
export class RegistrationInput {
    emailChallenge: string = "";
    deviceName: string = "";
    pushNotificationConfig: UserPushNotificationConfig = new UserPushNotificationConfig();
}

@json
export class RegistrationOutput {
    @omitnull()
    deviceId: string | null = null; // base 64 encoded
    @omitnull()
    seedTOTP: string | null = null; // base 64 encoded
    @omitnull()
    challengeState: ChallengeVerificationResult | null = null;
}

@json
export class RegisteringUser {
    userId: string = ""; // base 64 encoded
    deviceId: string = ""; // base 64 encoded
    email: UserVerifiableAttribute = new UserVerifiableAttribute;
    time: u64 = 0;

    static getFromDevice(deviceId: string): RegisteringUser | null {

        let value = Ledger.getTable(TBLE_NAMES.REGISTERING_USER).get(deviceId);
        if (value.length == 0)
            return null;

        return JSON.parse<RegisteringUser>(value);
    }
}