"use client"

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { io, Socket } from "socket.io-client"
import { GamePreferences } from './definitions'

interface RecordingSession {
	_id?: number,

	onResult?: (content: string) => void
	onEnd?: (finalContent: string, duration: number) => void // duration in seconds
}

interface SocketConnectionDataPayload {
	type: "end"|"interim",
	content: string,
	duration: number // duration of spoken interaction in seconds
}

export class Recorder {
	isRecording: boolean
	setIsRecording: Dispatch<SetStateAction<boolean>>

	isConnected: boolean
	setIsConnected: Dispatch<SetStateAction<boolean>>

	recorder?: MediaRecorder
	audioCtx?: AudioContext

	socket: Socket
	session: RecordingSession

	_createSessionResolve?: (value?: unknown) => void

	constructor({
		isRecording, setIsRecording,
		isConnected, setIsConnected,
		socketURL
	}: {
		isRecording: boolean, setIsRecording: Dispatch<SetStateAction<boolean>>,
		isConnected: boolean, setIsConnected: Dispatch<SetStateAction<boolean>>,
		socketURL: string
	}) {
		/**
		 * obtain user media recorder
		 * initialise websocket to transmit audio data
		 */

		// react states
		this.isRecording = isRecording
		this.setIsRecording = setIsRecording

		this.isConnected = isConnected
		this.setIsConnected = setIsConnected

		// memory
		this.session = {}

		// initialise microphone
		this.recorder
		this.audioCtx
		navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
			const recorder = new MediaRecorder(stream)
			this.recorder = recorder
			this.audioCtx = new AudioContext()

			const source = this.audioCtx.createMediaStreamSource(stream)
			const analyser = this.audioCtx.createAnalyser()
			analyser.fftSize = 2048

			const highpassFilter = this.audioCtx.createBiquadFilter()
			highpassFilter.type = "highpass"
			highpassFilter.frequency.value = 300 // set to 300hz for speech

			const lowpassFilter = this.audioCtx.createBiquadFilter()
			lowpassFilter.type = "lowpass"
			lowpassFilter.frequency.value = 3000 // set to 3kHz for speech

			const bufferLength = analyser.frequencyBinCount
			const dataArray = new Uint8Array(bufferLength)

			source.connect(analyser)
			source.connect(highpassFilter)
			source.connect(lowpassFilter)

			this.recorder.ondataavailable = async (event) => {
				if (!this.isRecording) {
					// not recording, stop microphone (mediaRecorder is listening for audio but internal state says otherwise)
					return this.stopRecording()
				}

				if (event.data.size > 0) {
					// voice data is in event.data
					if (!this.socket.connected) {
						// not connected, stop microphone
						return this.stopRecording()
					}

					// determine frequency analysis
					analyser.getByteFrequencyData(dataArray)
					let sum = 0
					for (let i = 0 i < bufferLength i++) {
						sum += dataArray[i]
					}

					const average = sum /bufferLength
					if (average > 10) {
						// speech detected and socket is connected -> send data to speech service
					}
					this.socket.emit("audio", event.data) // send binary data as array buffer
				}
			}
		}).catch(err => {
			// mic failed
			console.log("MIC RETRIEVAL FAILED", err)
		})

		// initialise socket
		this.socket = io(socketURL)

		const onConnect = () => {
			this.setIsConnected(true)

			this.socket.io.engine.on("upgrade", (transport) => {
				// upgraded

			})

		}

		const onDisconnect = () => {
			this.setIsConnected(false)
		}

		const onTranscription = async (data: SocketConnectionDataPayload) => {
			console.log("data received", data)
			if (data.content.length === 0) {
				// empty transcription
				return
			}

			switch (data.type) {
				case "end":
					if (this.session.onEnd) {
						await this.session.onEnd(data.content, data.duration)

						this.stopRecording()
						this.clearSession()
					}
					break
				case "interim":
					if (this.session.onResult) {
						this.session.onResult(data.content)
					}
			}
		}

		const onPreloadReady = async () => {
			console.log("came back first", this._createSessionResolve)
			if (this._createSessionResolve) {
				this._createSessionResolve()
			}
		}

		const onTranscriptionFailure = async () => {
			this.stopRecording()
			// let { onResult, onEnd } = this.session

			// this.clearSession()
			// this.createSession()

			// // attach back event handlers
			// this.session.onResult = onResult
			// this.session.onEnd = onEnd

			// console.log("reattached")
		}

		// establish socket connection
		if (this.socket.connected) {
			onConnect()
		}

		// attach events
		this.socket.on("connect", onConnect)
		this.socket.on("disconnect", onDisconnect)
		this.socket.on("transcription", onTranscription)
		this.socket.on("preload-ready", onPreloadReady)
		this.socket.on("transcription-failure", onTranscriptionFailure)
	}

	createSession() {
		/**
		 * creates a new recording session
		 */
		// create promise chain that only resolves when preload from speechService server has responded
		let p = new Promise((res) => {
			this._createSessionResolve = res
		}).then(() => {
			this.session = {
				_id: +new Date()
			}
			return this.session // to attach .onResult, .onEnd
		})

		// let server knows to preload connection to ML
		if (this.socket.connected) {
			console.log("preloading..")
			this.socket.emit("preload")
		}

		return p // return promise chain and wait for preload-ready to come through
	}

	clearSession() {
		/**
		 * called right after .stopRecording() usually
		 * clears the current recording session
		 */
		this.session = {} // new object
	}

	startRecording() {
		/**
		 * start mic input
		 * show corresponding status
		 */
		if (this.isRecording) {
			return console.warn("[WARN]: Trying to call .startRecording, however this.isRecording is already true", this.isRecording)
		}
		if (this.session._id == null) {
			return console.warn("[WARN]: Trying to call .startRecording, however no active session")
		}

		this.isRecording = true
		this.setIsRecording(true)

		if (this.recorder) {
			this.recorder.start(500) // listen to mic input every 1000ms
		}
	}

	stopRecording() {
		/**
		 * stop taking in mic input
		 * show corresponding status
		 */
		if (!this.isRecording) {
			return console.warn("[WARN]: Trying to call .stopRecording, however this.isRecording is already false", this.isRecording)
		}

		this.isRecording = false
		this.setIsRecording(false)

		if (this.recorder) {
			this.recorder.stop()
		}
	}

	cleanup() {
		// cleanup socket client
		this.socket.off()
		this.socket.close()

		// clean up media recorder
		if (this.recorder) {
			this.recorder.ondataavailable = null
			this.recorder.stream.getTracks().forEach(track => track.stop())
			this.recorder = undefined // remove reference
		}
	}
}