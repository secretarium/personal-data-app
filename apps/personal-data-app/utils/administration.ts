import { Ledger, Context, JSON } from '@klave/sdk';
import { TBLE_NAMES } from '../config';

@json
class MemberRole {
    role!: string;
    date!: u64;
}

export function registerOwner(userId: Uint8Array): bool {

    // Check is admin is already set
    let value = Ledger.getTable(TBLE_NAMES.ADMIN).get("ADMINS");
    if (value.length != 0)
        return false;

    // Create admin list and add user as owner
    let list = new Map<Uint8Array, MemberRole>();
    list.set(userId, { role: "owner", date: u64.parse(Context.get("trusted_time")) });

    // Save
    Ledger.getTable(TBLE_NAMES.ADMIN).set("ADMINS", JSON.stringify<Map<Uint8Array, MemberRole>>(list));
    return true;
}

export function isAdmin(userId: Uint8Array): bool {

    // Load admin list
    let value = Ledger.getTable(TBLE_NAMES.ADMIN).get("ADMINS");
    if (value.length == 0)
        return false;

    // Parse
    const list = JSON.parse<Map<Uint8Array, string>>(value);

    // Lookup
    return list.has(userId);
}

function manageUser(ownerId: Uint8Array, userId: Uint8Array, role: string): bool {

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
    let list = JSON.parse<Map<Uint8Array, MemberRole>>(value);

    // Verify access
    if (!list.has(ownerId) || list.get(ownerId).role != "owner")
        return false;

    // Update
    if (role == "remove")
        list.delete(userId);
    else
        list.set(userId, { role: role, date: u64.parse(Context.get("trusted_time")) });

    // Save
    Ledger.getTable(TBLE_NAMES.ADMIN).set("ADMINS", JSON.stringify<Map<Uint8Array, MemberRole>>(list));
    return true;
}

export function addOwner(ownerId: Uint8Array, newOwnerId: Uint8Array): bool {
    return manageUser(ownerId, newOwnerId, "owner");
}

export function removeOwner(ownerId: Uint8Array, removedOwnerId: Uint8Array): bool {
    return manageUser(ownerId, removedOwnerId, "remove");
}

export function addAdmin(ownerId: Uint8Array, newAdminId: Uint8Array): bool {
    return manageUser(ownerId, newAdminId, "admin");
}

export function removeAdmin(ownerId: Uint8Array, removedAdminId: Uint8Array): bool {
    return manageUser(ownerId, removedAdminId, "remove");
}