// Copyright 2025 Secretarium Ltd <contact@secretarium.org>


@json
export class AuthSessionStatus {
    id: string = "";
    status: string = "";
    expiry: u64 = 0;
}

@json
export class AuthSessionInternal extends AuthSessionStatus {
    userId: string = "";
    vendorId: string = "";
    time: u64 = 0;
    lifespan: u64 = 0;

    toAuthSessionStatus(utcNow: u64) : AuthSessionStatus {
        let expiry = this.time + this.lifespan;
        let ses = new AuthSessionStatus();
        ses.id = this.id;
        ses.expiry = expiry;
        ses.status = expiry < utcNow ? "expired" : this.status;
        return ses;
    }
}

@json
export class RequestAuthSessionInput {
    vendorId: string = "";
    lifespan: u64 = 0;
    metadata: Set<string> = new Set<string>();
}

@json
export class ConfirmAuthSessionInput {
    valid: boolean = false;
    sessionId: string = "";
    lifespan: u64 = 0;
}