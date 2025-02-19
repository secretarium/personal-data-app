// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Ledger, JSON } from '@klave/sdk';
import { MemberRole } from './types';
import { TBLE_NAMES } from '../../config';


export function registerOwner(userId: string, utcNow: u64): bool {

    // Check is admin is already set
    let value = Ledger.getTable(TBLE_NAMES.ADMIN).get("ADMINS");
    if (value.length != 0)
        return false;

    // Create admin list and add user as owner
    let list = new Map<string, MemberRole>();
    list.set(userId, { role: "owner", date: utcNow });

    // Save
    Ledger.getTable(TBLE_NAMES.ADMIN).set("ADMINS", JSON.stringify<Map<string, MemberRole>>(list));
    return true;
}

export function isAdmin(userId: string): bool {

    // Load admin list
    let value = Ledger.getTable(TBLE_NAMES.ADMIN).get("ADMINS");
    if (value.length == 0)
        return false;

    // Parse
    const list = JSON.parse<Map<string, string>>(value);

    // Lookup
    return list.has(userId);
}

function manageUser(ownerId: string, userId: string, role: string, utcNow: u64): bool {

    // Check inputs
    if (ownerId == userId)
        return false;
    if (role != "owner" && role != "admin" && role != "remove")
        return false;

    // Load admin list
    let value = Ledger.getTable(TBLE_NAMES.ADMIN).get("ADMINS");
    if (value.length == 0)
        return false;

    // Parse
    let list = JSON.parse<Map<string, MemberRole>>(value);

    // Verify access
    if (!list.has(ownerId) || list.get(ownerId).role != "owner")
        return false;

    // Update
    if (role == "remove")
        list.delete(userId);
    else
        list.set(userId, { role: role, date: utcNow });

    // Save
    Ledger.getTable(TBLE_NAMES.ADMIN).set("ADMINS", JSON.stringify<Map<string, MemberRole>>(list));
    return true;
}

export function addOwner(ownerId: string, newOwnerId: string, utcNow: u64): bool {
    return manageUser(ownerId, newOwnerId, "owner", utcNow);
}

export function removeOwner(ownerId: string, removedOwnerId: string, utcNow: u64): bool {
    return manageUser(ownerId, removedOwnerId, "remove", utcNow);
}

export function addAdmin(ownerId: string, newAdminId: string, utcNow: u64): bool {
    return manageUser(ownerId, newAdminId, "admin", utcNow);
}

export function removeAdmin(ownerId: string, removedAdminId: string, utcNow: u64): bool {
    return manageUser(ownerId, removedAdminId, "remove", utcNow);
}