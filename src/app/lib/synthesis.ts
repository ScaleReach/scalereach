import { synthesis } from "@/app/actions/google"

async function googleSpeechStream(mediaSource: MediaSource, text: string, resolverFn: () => void) {
	/**
	 * usage: googleSpeechStream()
	 * 
	 * streaming context
	 */
	const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg")
	let synthResult = await synthesis(text, 0)
	if (!synthResult) {
		// failed
		return resolverFn() // resolve returned promise as no sound will play
	}

	synthResult = new Uint8Array(synthResult)
	sourceBuffer.addEventListener("updateend", () => mediaSource.endOfStream())
	sourceBuffer.appendBuffer(synthResult.buffer)
}

async function googleSpeech(audio: HTMLAudioElement, text: string, resolverFn: () => void) {
	/**
	 * usage: googleSpeech()
	 * 
	 * non-streaming context
	 */
	let synthResult = await synthesis(text, 0)
	if (!synthResult) {
		// failed
		return resolverFn() // resolve returned promise as no sound will play
	}

	if (synthResult) {
		synthResult = new Uint8Array(synthResult) // convert it to an explicit uint8array object

		audio.src = URL.createObjectURL(new Blob([synthResult]))
		audio.play().catch(err => {
			resolverFn() // no audio -> resolve promise to continue game
		})
	}
}

export class Synthesiser {
	text: string

	constructor(text: string) {
		if (text.length >= 1000) {
			// guard
			throw new Error("Text size too large")
		}

		this.text = text
	}

	play() {
		/**
		 * plays the synthesised output when ready
		 * returns a promise that will resolve when playback is completed (either failed to start or finished)
		 */

		// return promise chain
		let resolverFn: () => void
		let p = new Promise<void>(res => {
			resolverFn = res
		})

		// create playback object
		const audio = new Audio()
		audio.addEventListener("ended", () => {
			resolverFn()
		})

		console.log("??", window.MediaSource)
		if (window.MediaSource) {
			// stream via media source
			const mediaSource = new MediaSource()

			audio.src = URL.createObjectURL(mediaSource)
			audio.play().catch(err => {
				resolverFn() // no audio -> resolve promise to continue game
			})

			mediaSource.addEventListener("sourceopen", async () => {
				console.log("SOURCE OPENED")

				const sourceBuffer = mediaSource.addSourceBuffer("audio/aac")
				const readableStream = await fetch(`/api/synth`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: this.text // send as raw string
				}).then(r => {
					console.log("STREAM RETURNED", r.body)
					return r.body
				}).catch(err => {
					console.warn("fetching readablestream", err)
					return
				})
				if (readableStream == null) {
					return resolverFn()
				}

				const reader = readableStream.getReader()
				const pushToBuffer = async () => {
					const { done, value } = await reader.read()
					if (done) {
						mediaSource.endOfStream()
						return
					}

					if (!sourceBuffer.updating) {
						sourceBuffer.appendBuffer(value)
					}
				}

				sourceBuffer.addEventListener("updateend", pushToBuffer)
				pushToBuffer() // initial update
			})

			mediaSource.addEventListener("error", e => {
				console.log("Mediasource error")
				resolverFn() // immediately resolve promise
			})
		} else {
			// preload audio then play it with an audio object
			const accumulateChunks = async () => {
				const readableStream = await fetch(`/api/synth`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: this.text // send as raw string
				}).then(r => {
					console.log("STREAM RETURNED", r.body)
					return r.body
				}).catch(err => {
					console.warn("fetching readablestream", err)
					return
				})
				if (readableStream == null) {
					return resolverFn()
				}

				// obtain readablestream's reader
				const reader = readableStream.getReader()

				let chunks = [] // stream and accumulate audio data here
				let finishedStreaming = false;
				while (!finishedStreaming) {
					const { value, done } = await reader.read();
					if (value) {
						chunks.push(value);
					}

					finishedStreaming = done;
				}

				// create blob from array of chunks
				const blob = new Blob(chunks, { type: "audio/aac" });

				audio.src = URL.createObjectURL(blob)
				audio.play().catch(err => {
					resolverFn() // no audio -> resolve promise to continue game
				})
			}

			accumulateChunks()
		}

		return p
	}
}