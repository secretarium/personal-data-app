// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../../config';
import { ApiOutcome, ApiResult } from '../../../types';
import { User } from '../types';
import { AddDeviceInput, RemoveDeviceInput, UserDevice } from './types';
import { addUserDevice, removeUserDevice } from './helpers';


export function getUserDevicesApi(deviceId: string): ApiResult<Array<UserDevice>> {

    // Load user
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiResult.Error<Array<UserDevice>>(`unkown device`);

    // Load user list of devices
    let userDevicesBlob = Ledger.getTable(TBLE_NAMES.USER_DEVICES).get(user.userId);
    if (userDevicesBlob.length == 0)
        return ApiResult.Success<Array<UserDevice>>(new Array<UserDevice>());
    let devicesList = JSON.parse<Array<string>>(userDevicesBlob);

    // Load devices information
    let userDevices = new Array<UserDevice>();
    for (let i = 0; i < devicesList.length; i++) {
        let userDeviceBlob = Ledger.getTable(TBLE_NAMES.DEVICE).get(devicesList[i]);
        if (userDeviceBlob.length == 0)
            return ApiResult.Error<Array<UserDevice>>(`can't load device information`);
        userDevices.push(JSON.parse<UserDevice>(userDeviceBlob));
    }

    // Return
    return ApiResult.Success(userDevices);
}

export function addUserDeviceApi(deviceId: string, utcNow: u64, input: AddDeviceInput): ApiOutcome {

    // Load user
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiOutcome.Error(`unkown device`);

    // Verify if new devices does not already belong to someone
    let newDeviceBlob = Ledger.getTable(TBLE_NAMES.DEVICE).get(input.deviceId);
    if (newDeviceBlob.length != 0)
        return ApiOutcome.Error(`device already registered`);

    // Add device
    if (!addUserDevice(user.userId, input.deviceId, utcNow, input))
        return ApiOutcome.Error(`can't register user device`);

    // Return
    return ApiOutcome.Success(`device added`);
}

export function removeUserDeviceApi(deviceId: string, input: RemoveDeviceInput): ApiOutcome {

    // Load user
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiOutcome.Error(`unkown device`);

    // Check device
    let deviceBlob = Ledger.getTable(TBLE_NAMES.DEVICE).get(input.deviceId);
    if (deviceBlob.length == 0)
        return ApiOutcome.Error(`unkown device to remove`);

    // Add device
    if (!removeUserDevice(user.userId, input.deviceId))
        return ApiOutcome.Error(`can't remove user device`);

    // Return
    return ApiOutcome.Success(`device removed`);
}

export function userDeviceMigrationApi(deviceId: string): ApiOutcome {

    // Load user
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiOutcome.Error(`unkown device`);

    // Load user device
    let userDeviceId = Ledger.getTable(TBLE_NAMES.USER_DEVICE).get(user.userId);
    if (userDeviceId.length == 0)
        return ApiOutcome.Success(`nothing to migrate`);

    // Update device (remove userId field)
    let deviceBlob = Ledger.getTable(TBLE_NAMES.DEVICE).get(userDeviceId);
    if (deviceBlob.length == 0)
        return ApiOutcome.Error(`can't load device data`);
    let device = JSON.parse<UserDevice>(deviceBlob);
    Ledger.getTable(TBLE_NAMES.DEVICE).set(userDeviceId, JSON.stringify<UserDevice>(device));

    // Remove entry
    Ledger.getTable(TBLE_NAMES.USER_DEVICE).unset(user.userId);

    // Register with new format
    Ledger.getTable(TBLE_NAMES.USER_DEVICES).set(user.userId, JSON.stringify<Array<string>>([userDeviceId]));

    // Return
    return ApiOutcome.Success(`success`);
}