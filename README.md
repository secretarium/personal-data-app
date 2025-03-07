# Secretarium Personal Data App

This app is dedicated to user authentication and personal data storage in trusted execution environments.

## APIS

### User Registration

---
```preRegister``` - Transaction, registers the user email address

```json
{ "email": "alice@bob.com" }
```

```json
{ "success": true }
```

---

```emailChallenge``` - Query, sends a challenge to the user email address for verification

```json
{ }
```

```json
{ "success": true }
```

---

```register``` - Transaction, verifies email challenge and finalises registration

```json
{ "emailChallenge": "1234ABCD", "deviceName": "Name", "pushNotificationConfig": { "token": "123456789", "encryptionKey": "abcde...zyx==" } }
```

```json
{ "success": true, "result": { "deviceId": "abcde...zyx==", "seedTOTP": "abcde...zyx==" } }
```

### Account recovery configuration

---

```getRecoveryConfig``` - Query, get the user recovery config

```json
{ }
```

```json
{ "success": true, "result": { "friends": [ "chloe@bob.com", "david@bob.com", "elodie@bob.com" ], "threshold": 2 } }
```

---

```manageRecoveryFriend``` - Transaction, add/remove a trusted friend for the account recovery process

```json
{ "email": "francois@bob.com", "operation": "add", "threshold": 3 }
```

```json
{ "success": true }
```
