// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from "@klave/sdk";
import { TBLE_NAMES } from "../../config";
import { ChallengeVerificationResult, UserChallengeableAttribute } from "../user/data/types";
import { RegisterUserInput } from "../user/registration/types";

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
    sessionId: string = ""; // base 64 encoded
    registration: RegisterUserInput = new RegisterUserInput();
}

@json
export class RecoverUserOutput {
    @omitnull()
    challengeState: ChallengeVerificationResult | null = null;
}

@json
export class RecoveryNotifToFriend {
    sessionId: string = ""; // base 64 encoded
    email: string = "";
}

@json
export class RecoveryConfig {
    recoveryFriends: Set<string> = new Set<string>(); // User chosen friends for recovery procedure
    friendVettingThreshold: number = 0;
    recoveryFriendOf: Set<string> = new Set<string>(); // Friends that chose user for their recovery procedure
}

@json
export class RecoveryConfigOutput {
    friends: Set<string> = new Set<string>(); // User chosen friends for recovery procedure
    threshold: number = 0;
}

@json
export class RecoveringUser {
    sessionId: string = ""; // base 64 encoded
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
    sessionId: string = ""; // base 64 encoded
    userId: string = ""; // base 64 encoded
    deviceId: string = ""; // base 64 encoded
    friendsResponses: Map<string, boolean> = new Map<string, boolean>();
    registration: RegisterUserInput = new RegisterUserInput();
    time: u64 = 0;
}

@json
export class RecoveryNotifyFriendsInput {
    sessionId: string = ""; // base 64 encoded
}

@json
export class RecoveringFriendResponseInput {
    sessionId: string = ""; // base 64 encoded
    approved: boolean = false;
}