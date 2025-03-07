// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../../config';
import { DeviceInput, UserDevice } from '../device/types';
import { removeItem } from '../../../utils';
import { ApiResult } from '../../../types';


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

export function disableUserDevice(deviceId: string): bool {

    // Remove device from user's aliases
    Ledger.getTable(TBLE_NAMES.DEVICE_USER).unset(deviceId);

    // Load device
    let deviceBlob = Ledger.getTable(TBLE_NAMES.DEVICE).get(deviceId);
    if (deviceBlob.length == 0)
        return false;
    let device = JSON.parse<UserDevice>(deviceBlob);

    // Update
    device.disabled = true;
    Ledger.getTable(TBLE_NAMES.DEVICE).set(deviceId, JSON.stringify(device));

    // Return
    return true;
}

export function disableAllUserDevices(userId: string): bool {

    // Load user list of devices
    let userDevicesBlob = Ledger.getTable(TBLE_NAMES.USER_DEVICES).get(userId);
    if (userDevicesBlob.length == 0)
        return true;

    // Remove all
    let devices = JSON.parse<Array<string>>(userDevicesBlob);
    for (let i = 0; i < devices.length; i++) {
        if (!disableUserDevice(devices[i]))
            return false;
    }

    // Return
    return true;
}