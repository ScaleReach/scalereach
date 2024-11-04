"use server"

import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { createHash } from "node:crypto"

import config from "@/app/config"

const SECRET_KEY = process.env.SECRET_KEY
const encodedSecretKey = new TextEncoder().encode(SECRET_KEY)

const SESSION_COOKIE_NAME = config.COOKIE_NAME

type SessionPayload = {
	userID?: string,
	authenticated: boolean,
	expiresAt: Date,
}

type ExtSessionPayload = SessionPayload & {
}

export async function hash(s: string) {
	/**
	 * s: string
	 * 
	 * returns a SHA512 salted hash of the string
	 * uses process.env.HASH_SALT as the salt value
	 * 
	 * returns string
	 */
	return createHash("sha512").update(`${s}${process.env.HASH_SALT}`).digest("hex")
}

export async function encrypt(payload: SessionPayload) {
	return new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("7d")
		.sign(encodedSecretKey)
}

export async function decrypt(session: string|undefined = ""): Promise<(SessionPayload|null)> {
	try {
		const verified = await jwtVerify(session, encodedSecretKey, {
			algorithms: ["HS256"]
		})
		const payload = verified.payload as SessionPayload

		return payload
	} catch (err) {
		console.log("Failed to verify session", err)
		return null
	}
}

export async function getCookie() {
	return cookies().get(SESSION_COOKIE_NAME)?.value
}

export async function setCookie(session: string, expires: Date) {
	/**
	 * session: string, return value of encrypt() (i.e. JWT's encrypted token)
	 */
	cookies().set(SESSION_COOKIE_NAME, session, {
		httpOnly: true,
		secure: false,
		expires: expires,
		sameSite: "lax",
		path: "/"
	})
}

export async function createSession(): Promise<ExtSessionPayload> {
	const now = +new Date()
	const expiresAt = new Date(now +6.048e+8) // 7 days

	const sessionData = { authenticated: false, expiresAt: expiresAt } as ExtSessionPayload
	const session = await encrypt(sessionData)

	await setCookie(session, expiresAt)

	// extends session data to include bridge
	// sessionData.bridge = createBridge()
	return sessionData
}

export async function getSession(): Promise<ExtSessionPayload|undefined> {
	const cookie = await getCookie()
	if (cookie == null) {
		return
	}

	try {
		const sessionData = await decrypt(cookie) as ExtSessionPayload
		if (sessionData == null) {
			return
		}

		return sessionData
	} catch (e: any) {
		// unable to decrypt session payload
		return
	}
}

export async function overwriteSession(session: ExtSessionPayload) {
	// const { bridge, ...strippedSession } = session

	const encrypted = await encrypt(session)
	return setCookie(encrypted, new Date(session.expiresAt))
}

export async function updateSession() {
	let session = cookies().get(SESSION_COOKIE_NAME)?.value
	const payload = await decrypt(session)

	if (!session || !payload) {
		return null
	}

	const expires = new Date(+new Date() +6.048e+8)
	payload.expiresAt = expires
	return setCookie(await encrypt(payload), expires)
}