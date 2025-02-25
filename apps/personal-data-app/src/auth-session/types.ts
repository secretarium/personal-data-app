// Copyright 2025 Secretarium Ltd <contact@secretarium.org>


@json
export class AuthSession {
    status: string = "";
    expiry: u64 = 0;
    @omitif("this.token.length == 0")
    token: string = "";
}

@json
export class AuthSessionInternal {
    userId: string = "";
    vendorId: string = "";
    time: u64 = 0;
    lifespan: u64 = 0;
    status: string = "";

    toAuthSession(utcNow: u64, token: string = "") : AuthSession {
        let expiry = this.time + this.lifespan;
        let ses = new AuthSession();
        ses.expiry = expiry;
        ses.status = expiry < utcNow ? "expired" : this.status;
        ses.token = token;
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

@json
export class RenewAuthSessionInput {
    token: string = "";
    lifespan: u64 = 0;
}