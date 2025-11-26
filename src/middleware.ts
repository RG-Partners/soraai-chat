import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/ping'];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((path) =>
    path === '/ping' ? pathname.startsWith('/ping') : pathname === path || pathname.startsWith(`${path}/`),
  );

const getSessionCookie = (request: NextRequest) => {
  const cookiePrefix = process.env.BETTER_AUTH_COOKIE_PREFIX ?? 'better-auth.';
  const baseName = `${cookiePrefix}session_token`;
  const secureName = `__Secure-${baseName}`;

  return (
    request.cookies.get(baseName)?.value ?? request.cookies.get(secureName)?.value ?? null
  );
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|manifest.webmanifest|robots.txt|sitemap.xml|api/auth|logo/).*)',
  ],
};
