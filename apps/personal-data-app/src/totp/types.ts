// Copyright 2025 Secretarium Ltd <contact@secretarium.org>


@json
export class UserTOTP {
    seed: string = ""; // base 64 encoded
    attempts: Array<u64> = new Array<u64>();
    verified: bool = false;
    lastVerificationTime: u64 = 0;
}