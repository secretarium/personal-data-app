// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { JSON, Ledger } from '@klave/sdk';
import { TBLE_NAMES } from '../../config';
import { User, UserInfoOutput } from './types';
import { ApiResult } from '../../types';
import { UserDevice } from './device/types';


export function getUserInfoApi(deviceId: string): ApiResult<UserInfoOutput> {

    // Load registering user
    const user = User.getUserFromDevice(deviceId);
    if (!user)
        return ApiResult.Error<UserInfoOutput>(`unkown device`);

    // Load user device info
    let deviceBlob = Ledger.getTable(TBLE_NAMES.DEVICE).get(deviceId);
    if (deviceBlob.length == 0)
        return ApiResult.Error<UserInfoOutput>(`can't load device data`);
    let device = JSON.parse<UserDevice>(deviceBlob);

    // Prepare result
    let userInfo = new UserInfoOutput();
    userInfo.email = user.email.toUserVerifiableAttribute();
    userInfo.device = device;

    // Return
    return ApiResult.Success(userInfo);
}