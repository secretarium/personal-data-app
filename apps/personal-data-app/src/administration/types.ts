// Copyright 2025 Secretarium Ltd <contact@secretarium.org>

import { EmailServiceConfiguration } from "../email/types";
import { PushNotificationServiceConfiguration } from "../push-notification/types";


@json
export class ManageAdminInput {
    email!: string;
    task!: string; // add-admin | remove-admin | add-owner | remove-owner
}

@json
export class AdministrateInput {
    type!: string;
    emailConfig: EmailServiceConfiguration | null = null;
    verifyEmailTemplate: string | null = null;
    pushNotificationConfig: PushNotificationServiceConfiguration | null = null;
    manageAdmin: ManageAdminInput | null = null;
}

@json
export class MemberRole {
    role!: string;
    date!: u64;
}