/**
 * synthesis text into audio
 * returns a readable stream
 */
import { createClient } from "@deepgram/sdk";
import { NextRequest, NextResponse } from "next/server";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY)

export async function POST(req: Request) {
	let text = await req.text() // read stream as text
	if (!text || typeof text !== "string" || text.length >= 1000) {
		return new NextResponse("Please provide text as raw string in request.body", { status: 400 })
	}

	const response = await deepgram.speak.request({ text }, { model: "aura-luna-en" })

	const stream = await response.getStream()
	const headers = await response.getHeaders()

	console.log("headers", headers)
	headers.set("Connection", "keep-alive")
	return new NextResponse(stream, { headers })
}