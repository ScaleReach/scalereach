import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { createSession, getSession, overwriteSession, updateSession } from '@/app/actions/identity'
 
export async function middleware(request: NextRequest) {
	/**
	 * middleware to ensure attachment of proper cookie
	 */
	let session = await getSession()
	if (!session) {
		// no cookie
		session = await createSession() // will set cookie too
	} else {
		// update session expirey
		await updateSession()
	}

	const a = NextResponse.next()
	return a
}
 
// See "Matching Paths" below to learn more
export const config = {
	matcher: "/",
}