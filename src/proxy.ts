import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  // The logic remains the same, just the convention has changed to 'proxy'
  return res;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/pos/:path*',
    '/employee/:path*',
    '/dashboard/:path*',
  ],
};
