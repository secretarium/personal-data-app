import { Ledger, Context, JSON } from '@klave/sdk';
import { TBLE_NAMES } from '../config';

@json
class MemberRole {
    role!: string;
    date!: u64;
}

export function registerOwner(userId: string): bool {

    // Check is admin is already set
    let value = Ledger.getTable(TBLE_NAMES.ADMIN).get("ADMINS");
    if (value.length != 0)
        return false;

    // Create admin list and add user as owner
    let list = new Map<string, MemberRole>();
    list.set(userId, { role: "owner", date: u64.parse(Context.get("trusted_time")) });

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

function manageUser(ownerId: string, userId: string, role: string): bool {

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
        list.set(userId, { role: role, date: u64.parse(Context.get("trusted_time")) });

    // Save
    Ledger.getTable(TBLE_NAMES.ADMIN).set("ADMINS", JSON.stringify<Map<string, MemberRole>>(list));
    return true;
}

export function addOwner(ownerId: string, newOwnerId: string): bool {
    return manageUser(ownerId, newOwnerId, "owner");
}

export function removeOwner(ownerId: string, removedOwnerId: string): bool {
    return manageUser(ownerId, removedOwnerId, "remove");
}

export function addAdmin(ownerId: string, newAdminId: string): bool {
    return manageUser(ownerId, newAdminId, "admin");
}

export function removeAdmin(ownerId: string, removedAdminId: string): bool {
    return manageUser(ownerId, removedAdminId, "remove");
}