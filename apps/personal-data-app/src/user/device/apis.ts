// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../../config';
import { ApiOutcome, ApiResult } from '../../../types';
import { User } from '../types';
import { UserDevice } from './types';


export function getUserDevicesApi(deviceId: string): ApiResult<Array<UserDevice>> {

    // Load user
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiResult.Error<Array<UserDevice>>(`unkown device`);

    // Load user list of devices
    let userDevicesBlob = Ledger.getTable(TBLE_NAMES.USER_DEVICES).get(user.userId);
    if (userDevicesBlob.length == 0)
        return ApiResult.Success<Array<UserDevice>>(new Array<UserDevice>());
    let deviceList = JSON.parse<Array<string>>(userDevicesBlob);

    // Load devices information
    let userDevices = new Array<UserDevice>();
    for (let i = 0; i < deviceList.length; i++) {
        let userDeviceBlob = Ledger.getTable(TBLE_NAMES.DEVICE).get(deviceList[i]);
        if (userDeviceBlob.length == 0)
            return ApiResult.Error<Array<UserDevice>>(`can't load device information`);
        userDevices.push(JSON.parse<UserDevice>(userDeviceBlob));
    }

    // Return
    return ApiResult.Success(userDevices);
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

    // Remove entry
    Ledger.getTable(TBLE_NAMES.USER_DEVICE).unset(user.userId);

    // Register with new format
    Ledger.getTable(TBLE_NAMES.USER_DEVICES).set(user.userId, JSON.stringify<Array<string>>([userDeviceId]));

    // Return
    return ApiOutcome.Success(`success`);
}