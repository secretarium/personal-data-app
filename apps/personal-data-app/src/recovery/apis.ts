// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from '@klave/sdk';
import { ApiOutcome } from '../../types';
import { TBLE_NAMES } from '../../config';
import { ManageRecoveryFriendInput, RecoveryConfig } from './types';
import { User } from '../user/types';


function getUserRecoveryConfig(userId: string): RecoveryConfig {

    let value = Ledger.getTable(TBLE_NAMES.RECOVERY_CONFIG).get(userId);
    if (value.length == 0)
        return new RecoveryConfig();

    return JSON.parse<RecoveryConfig>(value);
}

export function manageRecoveryFriendApi(devicePublicKeyHashB64: string, input: ManageRecoveryFriendInput): ApiOutcome {

    // Check input
    if (input.operation != "add" && input.operation != "remove")
        return ApiOutcome.Error(`invalid operation`);

    // Load user and user recovery config
    const user = User.getUserFromDevice(devicePublicKeyHashB64);
    if (!user)
        return ApiOutcome.Error(`unkown device`);
    const userRecovCfg = getUserRecoveryConfig(user.userId);

    // Load friend and friend recovery config
    const friend = User.getUserFromEmail(input.email);
    if (!friend)
        return ApiOutcome.Error(`unkown friend`);
    const friendRecovCfg = getUserRecoveryConfig(friend.userId);

    // Update both configs
    if (input.operation == "add") {
        userRecovCfg.recoveryFriends.add(friend.userId);
        if (input.threshold <= 0 || input.threshold > userRecovCfg.recoveryFriends.size)
            return ApiOutcome.Error(`invalid arguement`);
        userRecovCfg.friendVettingThreshold = input.threshold;
        friendRecovCfg.recoveryFriendOf.add(user.userId);
    }
    else {
        userRecovCfg.recoveryFriends.delete(friend.userId);
        if ((input.threshold <= 0 && userRecovCfg.recoveryFriends.size > 0) || input.threshold > userRecovCfg.recoveryFriends.size)
            return ApiOutcome.Error(`invalid arguement`);
        userRecovCfg.friendVettingThreshold = input.threshold;
        friendRecovCfg.recoveryFriendOf.delete(user.userId);
    }

    // Save
    Ledger.getTable(TBLE_NAMES.RECOVERY_CONFIG).set(user.userId, JSON.stringify<RecoveryConfig>(userRecovCfg));
    Ledger.getTable(TBLE_NAMES.RECOVERY_CONFIG).set(friend.userId, JSON.stringify<RecoveryConfig>(friendRecovCfg));

    return ApiOutcome.Success(`friend added`);
}