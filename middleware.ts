import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Simple session check (can be improved with supabase middleware)
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  
  // For now, let's keep it simple. Real auth check should happen here.
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
