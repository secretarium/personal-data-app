// Copyright 2025 Secretarium Ltd <contact@secretarium.org>


@json
export class DeviceInput {
    deviceName: string = "";
}

@json
export class AddDeviceInput extends DeviceInput {
    deviceId: string = "";
}

@json
export class RemoveDeviceInput {
    deviceId: string = "";
}

@json
export class UserDevice {
    name: string = "";
    publicKeyHash: string = ""; // base 64 encoded
    time: u64 = 0;
    disabled: boolean = false;
    @omitif("this.attributes.size == 0")
    attributes: Map<string, string> = new Map<string, string>();
}