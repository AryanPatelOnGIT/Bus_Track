import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;

  if (!authToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/driver/:path*', '/passenger/:path*'],
};
