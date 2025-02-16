import { JSON, HTTP, HttpRequest, Crypto } from '@klave/sdk';
import { PushNotificationConfiguration } from '../types';
import { UserPushNotification } from '../types/user-data';
import * as Base64 from "as-base64/assembly";

@json
class ExpoPushNotificationObject {
    to!: string;
    body!: string;
}

export function pushNotif(config: PushNotificationConfiguration, userCfg: UserPushNotification, msg: string): bool {

    // Encrypt
    let aesKeyRes = Crypto.Subtle.importKey("raw", Base64.decode(userCfg.encryptionKey).buffer, {length: 128} as Crypto.AesKeyGenParams, true, ["encrypt", "decrypt"]);
    if (!aesKeyRes.data)
        return false;
    let aesKey = aesKeyRes.data as Crypto.CryptoKey;
    let iv = Crypto.getRandomValues(12);
    if (!iv)
        return false;
    let aesGcmParams = {iv : iv.buffer, additionalData : new ArrayBuffer(0), tagLength : 128} as Crypto.AesGcmParams;
    let encrypted = Crypto.Subtle.encrypt(aesGcmParams, aesKey, String.UTF8.encode(msg));
    if (!encrypted.data)
        return false;
    let concat = new Uint8Array(iv.length + encrypted.data!.byteLength);
    concat.set(iv!);
    concat.set(Uint8Array.wrap(encrypted.data!), iv.length);
    let body = Base64.encode(concat);

    // Call API
    const pushReq: HttpRequest = {
        hostname: 'notifier.secretarium.org',
        port: 443,
        path: '/push',
        method: 'POST',
        version: 'HTTP/1.1',
        headers: [
            ['Content-Type', 'application/json'],
            ['Accept', 'application/json'],
            ['Authorization', `Bearer ${config.bearerToken}`]
        ],
        body: JSON.stringify<ExpoPushNotificationObject>({ to: userCfg.token, body: body })
    };
    const pushResp = HTTP.request(pushReq);
    if (!pushResp || !pushResp.statusCode)
        return false;

    return pushResp.statusCode == 200;
}
