// Copyright 2025 Secretarium Ltd <contact@secretarium.org>


@json
export class ChallengeVerificationResult {
    success: boolean = false;
    lockedUntil: u64 = 0; // Ns
    remainingAttempts: u32 = 0;
}

@json
export class UserVerifiableAttribute {
    value: string = "";
    challenge: string = "";
    attempts: Array<u64> = new Array<u64>();
    verified: boolean = false;
    verifiers: Array<string> = new Array<string>();
    lastVerificationTime: u64 = 0;

    getLockedUntil() : u64 {

        if (this.attempts.length <= 3)
            return 0;

        let lockedTime: u64 = 60 * 60 * 1000000000 * (
            this.attempts.length == 3 ? 3 :
            this.attempts.length == 4 ? 6 :
            this.attempts.length == 5 ? 12 :
            this.attempts.length == 6 ? 24 :
            this.attempts.length == 7 ? 48 : 72);

        return this.attempts[this.attempts.length - 1] + lockedTime;
    }

    setVerified(nowUtcNs: u64) : void {

        this.attempts = new Array<u64>(); // empty array
        this.lastVerificationTime = nowUtcNs;
        this.verified = true;
        this.verifiers.push("Secretarium");
    }

    verifyChallenge(nowUtcNs: u64, code: string) : ChallengeVerificationResult {

        let result = new ChallengeVerificationResult();

        // Check attempts state (if already beyond 3 attempts)
        if (this.attempts.length >= 3)
        {
            let lockedUntil = this.getLockedUntil();
            if (lockedUntil > nowUtcNs) {
                result.lockedUntil = lockedUntil;
                return result;
            }
        }

        // If challenge does not verify, we need to log the attempt
        if (this.challenge != code)
        {
            // Add attempt
            this.attempts.push(nowUtcNs);

            // Compute correct error message
            if (this.attempts.length >= 3) {
                result.lockedUntil = this.getLockedUntil();
            }
            else if(this.attempts.length == 2)
                result.remainingAttempts = 1;
            else
                result.remainingAttempts = 2;

            return result;
        }

        // Challenge did verify! Let's clean the attempts and add/update the attestation
        this.setVerified(nowUtcNs);

        result.success = true;
        return result;
    }
}

@json
export class UserData {
    attributes: Map<string, string> = new Map<string, string>();
    verifiableAttributes: Map<string, UserVerifiableAttribute> = new Map<string, UserVerifiableAttribute>();
}