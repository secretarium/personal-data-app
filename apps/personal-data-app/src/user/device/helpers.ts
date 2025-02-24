// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../../config';
import { DeviceInput, UserDevice } from '../device/types';
import { removeItem } from '../../../utils';


export function addUserDevice(userId: string, deviceIdToAdd: string, utcNow: u64, input: DeviceInput): bool {

    // Register device
    let device = new UserDevice();
    device.publicKeyHash = deviceIdToAdd;
    device.time = utcNow;
    device.name = input.deviceName;
    Ledger.getTable(TBLE_NAMES.DEVICE).set(deviceIdToAdd, JSON.stringify<UserDevice>(device));
    Ledger.getTable(TBLE_NAMES.DEVICE_USER).set(deviceIdToAdd, userId); // alias

    // Load user list of devices
    let userDevicesBlob = Ledger.getTable(TBLE_NAMES.USER_DEVICES).get(userId);
    let userDevicesList = userDevicesBlob.length == 0
        ? new Array<string>()
        : JSON.parse<Array<string>>(userDevicesBlob);

    // Add device to user's list
    userDevicesList.push(deviceIdToAdd);
    Ledger.getTable(TBLE_NAMES.USER_DEVICES).set(userId, JSON.stringify(userDevicesList)); // User devices

    // Return
    return true;
}

export function removeUserDevice(userId: string, deviceIdToRemove: string): bool {

    // Remove device
    Ledger.getTable(TBLE_NAMES.DEVICE).unset(deviceIdToRemove);
    Ledger.getTable(TBLE_NAMES.DEVICE_USER).unset(deviceIdToRemove); // alias

    // Load user list of devices
    let userDevicesBlob = Ledger.getTable(TBLE_NAMES.USER_DEVICES).get(userId);
    let userDevicesList = userDevicesBlob.length == 0
        ? new Array<string>()
        : JSON.parse<Array<string>>(userDevicesBlob);

    // Remove device from user's list
    userDevicesList = removeItem(userDevicesList, deviceIdToRemove);
    if (userDevicesList.length == 0)
        Ledger.getTable(TBLE_NAMES.USER_DEVICES).unset(userId); // User devices
    else
        Ledger.getTable(TBLE_NAMES.USER_DEVICES).set(userId, JSON.stringify(userDevicesList)); // User devices

    // Return
    return true;
}