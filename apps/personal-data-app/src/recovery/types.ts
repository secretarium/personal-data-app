// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from "@klave/sdk";
import { TBLE_NAMES } from "../../config";
import { ChallengeVerificationResult, UserChallengeableAttribute } from "../user/data/types";
import { UserPushNotificationConfig } from '../push-notification/types';

@json
export class ManageRecoveryFriendInput {
    email: string = "";
    operation: string = ""; // add | remove
    threshold: number = 0;
}

@json
export class InitiateRecoveryInput {
    email: string = "";
}

@json
export class RecoverUserInput {
    emailChallenge: string = "";
    pushNotificationConfig: UserPushNotificationConfig = new UserPushNotificationConfig();
}

@json
export class RecoverUserOutput {
    @omitnull()
    challengeState: ChallengeVerificationResult | null = null;
}

@json
export class RecoveryNotifToFriend {
    email: string = "";
}

@json
export class RecoveryConfig {
    recoveryFriends: Set<string> = new Set<string>(); // User chosen friends for recovery procedure
    friendVettingThreshold: number = 0;
    recoveryFriendOf: Set<string> = new Set<string>(); // Friends that chose user for their recovery procedure
}

@json
export class RecoveringUser {
    deviceId: string = ""; // temporary, base 64 encoded
    email: UserChallengeableAttribute = new UserChallengeableAttribute;
    time: u64 = 0;

    static getFromDevice(deviceId: string): RecoveringUser | null {

        let value = Ledger.getTable(TBLE_NAMES.RECOVERING_USER).get(deviceId);
        if (value.length == 0)
            return null;

        return JSON.parse<RecoveringUser>(value);
    }
}

@json
export class RecoveringSession {
    userId: string = ""; // base 64 encoded
    friendsResponses: Map<string, boolean> = new Map<string, boolean>();
    pushNotificationConfig: UserPushNotificationConfig = new UserPushNotificationConfig();
    time: u64 = 0;
}