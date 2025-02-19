// Copyright 2025 Secretarium Ltd <contact@secretarium.org>


@json
export class UserDevice {
    name: string = "";
    publicKeyHash: string = ""; // base 64 encoded
    userId: string = ""; // base 64 encoded
    time: u64 = 0;
    attributes: Map<string, string> = new Map<string, string>();
}