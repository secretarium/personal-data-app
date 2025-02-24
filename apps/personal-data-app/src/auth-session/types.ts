// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { computeUserVendorId } from "../token/helpers";


@json
export class AuthSessionInternal {
    id: string = "";
    userId: string = "";
    vendorId: string = "";
    time: u64 = 0;
    lifespan: u64 = 0;
    status: string = "";
    @omitif("this.token.length == 0")
    token: string = "";

    toAuthSession(utcNow: u64) : AuthSession {

        let expiry = this.time + this.lifespan;
        let ses = new AuthSession();
        ses.id = this.id;
        ses.expiry = expiry;
        ses.userVendorId = computeUserVendorId(this.userId, this.vendorId);
        if (expiry < utcNow) {
            ses.status = "expired";
            ses.token = "";
        }
        else {
            ses.status = this.status;
            ses.token = this.status == "confirmed" ? this.token : "";
        }
        return ses;
    }
}

@json
export class AuthSession {
    id: string = "";
    userVendorId: string = "";
    expiry: u64 = 0;
    status: string = "";
    @omitif("this.token.length == 0")
    token: string = "";
}

@json
export class GetAuthSessionInput {
    sessionId: string = "";
}

@json
export class StartAuthSessionInput {
    email: string = "";
    vendorId: string = "";
    lifespan: u64 = 0;
}

@json
export class ConfirmAuthSessionInput {
    valid: boolean = false;
    sessionId: string = "";
    lifespan: u64 = 0;
}