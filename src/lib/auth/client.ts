'use client';

import { adminClient, inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { auth } from './auth-instance';
import {
	DEFAULT_USER_ROLE,
	USER_ROLES,
	ac,
	adminRoleDefinition,
	editorRoleDefinition,
	userRoleDefinition,
} from './roles';

export const authClient = createAuthClient({
	plugins: [
		inferAdditionalFields<typeof auth>(),
		adminClient({
			defaultRole: DEFAULT_USER_ROLE,
			adminRoles: [USER_ROLES.ADMIN],
			ac,
			roles: {
				admin: adminRoleDefinition,
				editor: editorRoleDefinition,
				user: userRoleDefinition,
			},
		}),
	],
});
