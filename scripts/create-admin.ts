import './load-env';
import { eq } from 'drizzle-orm';

import { auth } from '../src/lib/auth/auth-instance';
import { pgDb } from '../src/lib/db';
import { users } from '../src/lib/db/schema';

const email = 'admin@example.com';
const password = 'Password123!';
const name = 'Local Admin';

(async () => {
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
      headers: new Headers({
        'x-forwarded-host': 'localhost:3000',
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      }),
    });

    console.log('Sign-up response:', res);
  } catch (error) {
    console.error('Failed to create admin:', error);
  }

  const [promotion] = await pgDb
    .update(users)
    .set({ role: 'admin' })
    .where(eq(users.email, email))
    .returning({ id: users.id, role: users.role });

  if (promotion) {
    console.log('Updated user role:', promotion);
  } else {
    console.error('No user found to promote. Check the email address.');
  }
})();
