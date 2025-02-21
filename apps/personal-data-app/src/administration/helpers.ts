// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { Ledger, JSON } from '@klave/sdk';
import { MemberRole } from './types';
import { TBLE_NAMES } from '../../config';


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

function manageAdmin(ownerId: string, userId: string, role: string, utcNow: u64): bool {

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
    return manageAdmin(ownerId, newOwnerId, "owner", utcNow);
}
export function removeOwner(ownerId: string, removedOwnerId: string, utcNow: u64): bool {
    return manageAdmin(ownerId, removedOwnerId, "remove", utcNow);
}
export function addAdmin(ownerId: string, newAdminId: string, utcNow: u64): bool {
    return manageAdmin(ownerId, newAdminId, "admin", utcNow);
}
export function removeAdmin(ownerId: string, removedAdminId: string, utcNow: u64): bool {
    return manageAdmin(ownerId, removedAdminId, "remove", utcNow);
}

export function manageEmailDisposableList(emails: Set<string>, task: string): bool {

    // Check inputs
    if (emails.size == 0)
        return false;
    if (task != "add" && task != "remove")
        return false;

    // Load list
    let value = Ledger.getTable(TBLE_NAMES.BLACKLIST).get("DISPOSABLE_EMAIL_DOMAINS");
    if (value.length == 0)
        return false;

    // Parse
    let list = JSON.parse<Set<string>>(value);

    // Update
    let a = emails.values(); // Set does not support iterators (as of Feb 2025)
    for (let i = 0; i < a.length; i++) {
        if (task == "add")
            list.add(a[i]);
        else
            list.delete(a[i]);
    }

    // Save
    Ledger.getTable(TBLE_NAMES.BLACKLIST).set("DISPOSABLE_EMAIL_DOMAINS", JSON.stringify<Set<string>>(list));
    return true;
}