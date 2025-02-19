// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

@json
export class ManageRecoveryFriendInput {
    email: string = "";
    operation: string = ""; // add | remove
    threshold: number = 0;
}

@json
export class RecoveryConfig {
    recoveryFriends: Set<string> = new Set<string>(); // User chosen friends for recovery procedure
    friendVettingThreshold: number = 0;
    recoveryFriendOf: Set<string> = new Set<string>(); // Friends that chose user for their recovery procedure
}