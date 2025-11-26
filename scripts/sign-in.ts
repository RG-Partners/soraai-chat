import './load-env';
import { auth } from '../src/lib/auth/auth-instance';

const email = 'admin@example.com';
const password = 'Password123!';

(async () => {
  try {
    const res = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: new Headers({
        'x-forwarded-host': 'localhost:3000',
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      }),
    });

    console.log('Sign-in response:', res);
  } catch (error) {
    console.error('Failed to sign in:', error);
  }
})();
