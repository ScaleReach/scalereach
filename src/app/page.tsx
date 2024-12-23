"use client"

import logo from "@/public/logo.svg"
import { Backspace, PhoneSlash } from "@phosphor-icons/react"
import { createContext, Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from "react"
import { preload } from "react-dom"

import { Jane } from "@/app/lib/jane"
import { Synthesiser } from "@/app/lib/synthesis"
import { Recorder } from "@/app/lib/recognition"

import config from "@/app/config"

enum PhoneState {
	NOTREADY,
	READY,
	CONNECTED,
	ENDED
}

type PhoneContext = {
	isLoading?: boolean,
	setIsLoading?: Dispatch<SetStateAction<boolean>>,
	state?: PhoneState,
	setState?: Dispatch<SetStateAction<PhoneState>>,
	masterCallState?: boolean,
	setMasterCallState?: Dispatch<SetStateAction<boolean>>,
	phoneCallDuration?: number,
	setPhoneCallDuration?: Dispatch<SetStateAction<number>>,
	showDialPad?: boolean,
	setShowDialPad?: Dispatch<SetStateAction<boolean>>,
	dialPadContent?: string,
	setDialPadContent?: Dispatch<SetStateAction<string>>,
	transcriptionText?: string
	transcriptionState?: boolean,
	isRecorderListening?: boolean
}

const PhoneContext = createContext<PhoneContext>({})

function CallBubble() {
	const { state, setState, isLoading, isRecorderListening } = useContext(PhoneContext)

	const [ showBubble, setShowBubble ] = useState(false)
	useEffect(() => {
		let timeIntervalId: NodeJS.Timeout;
		if (isLoading === false) {
			timeIntervalId = setTimeout(() => setShowBubble(true), 1000)
		}

		return () => {
			if (timeIntervalId) {
				clearTimeout(timeIntervalId)
			}
		}
	}, [isLoading])
	useEffect(() => {
		let timeIntervalId: NodeJS.Timeout;
		if (state === PhoneState.ENDED) {
			timeIntervalId = setTimeout(() => setShowBubble(false), 1000)
		}
		if (state === PhoneState.READY || state === PhoneState.CONNECTED) {
			timeIntervalId = setTimeout(() => setShowBubble(true), 1000)
		}

		return () => {
			if (timeIntervalId) {
				clearTimeout(timeIntervalId)
			}
		}
	}, [state])

	const READY_COLOR = "#d9d9d9"
	const CONNECTED_COLOR = "#6fd676"

	return (
		<div className="grow flex items-center justify-center transition-transform" style={{
			transform: showBubble ? "scale(1)" : "scale(0)",
			transitionDuration: "5s",
			animation: isRecorderListening ? "ping 500ms cubic-bezier(.4, 0, 0.2, 1) infinite alternate" : ""
		}}>
			<div className="relative rounded-full w-32 h-32 box-border transition-color duration-500" style={{
				borderWidth: state !== PhoneState.ENDED ? "2px" : "0",
				borderStyle: "solid",
				borderColor: state === PhoneState.READY ? READY_COLOR : CONNECTED_COLOR
			}}>
				<div className="absolute w-[calc(100%_+_4px)] h-[calc(100%_+_4px)] rounded-full top-[-2px] left-[-2px] origin-center" style={{
					backgroundColor: state === PhoneState.CONNECTED ? CONNECTED_COLOR : READY_COLOR,
					animationName: state === PhoneState.ENDED ? "" : "grow-inf",
					animationDuration: state === PhoneState.READY ? "5s" : "2s",
					animationDirection: state === PhoneState.READY ? "alternate" : "normal",
					animationFillMode: "forwards",
					animationTimingFunction: "ease-out",
					animationIterationCount: state === PhoneState.READY ? "infinite" : "1",
					transitionDuration: "5000ms",
					transitionProperty: "background-color"
				}}>
				</div>
			</div>
		</div>
	)
}

function CallToolbar() {
	const { state, setState, setMasterCallState, isLoading, phoneCallDuration, setShowDialPad } = useContext(PhoneContext)

	const [ showToolbar, setShowToolbar ] = useState(false)
	useEffect(() => {
		let timeIntervalId: NodeJS.Timeout;
		if (isLoading === false) {
			timeIntervalId = setTimeout(() => setShowToolbar(true), 1000)
		}

		return () => {
			if (timeIntervalId) {
				clearTimeout(timeIntervalId)
			}
		}
	}, [isLoading])

	const formatTime = (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;

		const formattedMinutes = String(minutes).padStart(2, '0');
		const formattedSeconds = String(remainingSeconds).padStart(2, '0');

		return `${formattedMinutes}:${formattedSeconds}`;
	}


	return (
		<div className="w-3/4 rounded-xl bg-foreground flex justify-between shadow-brand p-2" style={{
			visibility: showToolbar ? "visible" : "hidden",
			animationName: showToolbar ? "jump-in" : "",
			animationDuration: "1s",
			animationFillMode: "forwards",
			animationTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
		}}>
			<div className="flex items-center gap-2 p-2">
				<p>Jane</p>
				{
					state === PhoneState.CONNECTED && (
						<>
							<div className="w-1 h-1 rounded-full bg-color"></div>
							<p style={{
								animationName: "jump-fade-in",
								animationDuration: "1s",
								animationFillMode: "forwards",
								animationTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
							}}>{phoneCallDuration != null ? formatTime(phoneCallDuration) : "00:00"}</p>
						</>
					)
				}
			</div>
			{
				state === PhoneState.CONNECTED ? (
					<button className="px-3 p-1 rounded-md bg-red" onClick={() => {
						// HERE
						if (!setMasterCallState) return
						setMasterCallState(false) // drop call
					}}>
						<PhoneSlash size={32} />
					</button>
				) : (
					<button className="p-2" onClick={() => {
						if (!setMasterCallState) return
						setMasterCallState(true) // pick up call
					}}>
						<p>Call</p>
					</button>
				)
			}
		</div>
	)
}

function DialPadField() {
	const { dialPadContent, setDialPadContent } = useContext(PhoneContext)
	return (
		<div className="px-4 py-2 flex justify-center items-center border-b border-solid border-[rgb(41_41_41)]">
			<p className="grow text-center text-2xl">{dialPadContent?.length === 0 ? "\u00A0" : dialPadContent}</p>
			<button name="delete-button" onClick={() => {
				if (!dialPadContent || !setDialPadContent) {
					return
				}

				setDialPadContent(dialPadContent.slice(0, dialPadContent.length -1))
			}}>
				<Backspace size={24} />
			</button>
		</div>
	)
}

function DialPad() {
	const { showDialPad, dialPadContent, setDialPadContent } = useContext(PhoneContext)
	let keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]

	const [touchTones, setTouchTones] = useState<{[key: string]: HTMLAudioElement}>({})
	useEffect(() => {
		// preload touch tones audio files
		const preloadedAudio: {[key: string]: HTMLAudioElement} = {}

		keys.forEach(key => {
			let audioName = key
			if (key === "#") {
				audioName = "pound"
			} else if (key === "*") {
				audioName = "star"
			}
			preloadedAudio[key] = new Audio(`/tones/${audioName}.wav`)
		})

		setTouchTones(preloadedAudio)
	}, [])

	return (
		<div className="grow grid grid-cols-3" style={{
			animationName: "keypad-up",
			animationDuration: "1s",
			animationFillMode: "forwards",
			animationDirection: showDialPad ? "normal" : "alternate"
		}}>
			{
				keys.map((key, i) =>
					<button key={i} className="p-3 font-bold text-2xl transition-colors" style={{
						animationDuration: "180ms",
						animationFillMode: "forwards",
					}} onClick={e => {
						e.currentTarget.style.animationName = "keypress"

						// play corresponding touch tone
						if (touchTones[key]) {
							touchTones[key].currentTime = 0
							touchTones[key].play()
						}

						// haptic feedback
						navigator.vibrate(1000)

						// add into input
						if (setDialPadContent) {
							setDialPadContent(dialPadContent +key)
						}
					}} onAnimationEnd={e => {
						e.currentTarget.style.animationName = ""
					}}>
						<p>{key}</p>
					</button>
				)
			}
		</div>
	)
}

function CallTranscription() {
	const { transcriptionText, transcriptionState } = useContext(PhoneContext)

	return (
		<div className="flex jsutify-center items-center pb-8">
			<p className="transition-colors" style={{
				color: transcriptionState ? "#fff" : "#ff0000"
			}}>{transcriptionText}</p>
		</div>
	)
}

function DialWindow() {
	const { state, setState, isLoading, showDialPad } = useContext(PhoneContext)

	return (
		<div className="grow w-full flex flex-col items-center justify-center" style={{
			transitionDuration: "2s",
			transitionProperty: "max-height",
			maxHeight: isLoading ? "0" : "100%"
		}}>
			<div className="grow w-full flex flex-col items-center justify-center p-4">
				<CallBubble />
				<CallTranscription />
				<CallToolbar />
			</div>
			{
				showDialPad && (
					<div className="w-full flex flex-col bg-[#090909] z-10">
						<DialPadField />
						<DialPad />
					</div>
				)
			}
		</div>
	)
}

export default function Main() {
	const [isLoading, setIsLoading] = useState(true)
	const [state, setState] = useState(PhoneState.READY)
	const [phoneCallDuration, setPhoneCallDuration] = useState(0)
	const [showDialPad, setShowDialPad] = useState(false)

	const [transcriptionText, setTranscriptionText] = useState("")
	const [transcriptionState, setTranscriptionState] = useState(false) // true if final, false if interim
	const transcriptionWriterOwnerRef = useRef(0)
	const transcriptionWriterContentRef = useRef<string[]>([]) // store tokens of transcribed text to be displayed (typewriter effect)

	// phone state wrapper
	const [masterCallState, setMasterCallState] = useState<boolean>(false) // true if in-call, false if call dropped

	// recorder states
	const currentRecorderRef = useRef<Recorder|undefined>()
	const [isRecording, setIsRecording] = useState(false)
	const [isConnected, setIsConnected] = useState(false)
	const [isListening, setIsListening] = useState(false)

	// synthesiser
	const currentSynthPlayerRef = useRef<Synthesiser|undefined>()

	// dialpad
	const [dialPadContent, setDialPadContent] = useState("")
	const dialPadFinishCbRef = useRef<(finalDialPadContent: string) => void>()

	// recorder
	const socketURL = config.ASR.URL
	const newSession = async (j: Jane) => {
		if (currentRecorderRef.current) {
			// clean up previous recorder
			currentRecorderRef.current.stopRecording()
			currentRecorderRef.current.cleanup()
			currentRecorderRef.current = undefined // unset
		}

		// create new recorder
		let recorderStates = {
			isRecording, setIsRecording,
			isConnected, setIsConnected,
			isListening, setIsListening,
			socketURL
		}
		let recorder = new Recorder(recorderStates)
		currentRecorderRef.current = recorder // store reference

		let recordingSession = await recorder.createSession()
		recordingSession.onResult = (content) => {
			setTranscriptionText(content) // set content
			setTranscriptionState(false) // show interim indicator
			console.log("results", content)
		}
		recordingSession.onEnd = async (finalContent, duration) => {
			// recorder should already be stopped
			setTranscriptionText(finalContent) // set final content
			setTranscriptionState(true) // show final indicator
			console.log("final results", finalContent, "took", duration)

			// pass message to jane
			j.chat(finalContent)

			// cleanup (remove reference entirely to current recorder object)
			recorder.cleanup() // no need to invoke .stopRecording() method since session.onEnd will do so internally
			currentRecorderRef.current = undefined

			return false // dont preserve since recorder instance will get wiped out
		}
		recorder.onQuit = () => {
			// server force quit, most likely due to timeout
			console.log("RECORDER QUITTING")
			setMasterCallState(false)
			setTimeout(() => setTranscriptionText("Speech service disconnected abruptly"), 500)
		}

		// start recording
		await currentRecorderRef.current.micReadyPromise // wait for mic to be ready
		console.log("mic ready")
		currentRecorderRef.current.startRecording()
		console.log("started recording")
	}

	const dialPadTargetRegex = /^\d{7}#\d{7}#$/
	useEffect(() => {
		/**
		 * listen for target input from dialpad in the format "NRICWithoutAlphabets#BANKNO#" (e.g. "1xxx121#2345678#")
		 * call respective function upon target interested input received
		 */
		console.log("matching", dialPadFinishCbRef.current, dialPadContent, dialPadTargetRegex.test(dialPadContent))
		if (dialPadContent.length >= 1 && dialPadFinishCbRef.current) {
			if (dialPadTargetRegex.test(dialPadContent)) {
				// match
				dialPadFinishCbRef.current(dialPadContent) // invoke function (will unset reference internally)
			}
		}
	}, [dialPadContent])

	// initial loading screen
	useEffect(() => {
		let timeIntervalId = setTimeout(() => setIsLoading(false), 50)

		return () => clearTimeout(timeIntervalId)
	}, [])

	// master phone call state
	useEffect(() => {
		if (masterCallState) {
			if (state === PhoneState.ENDED) {
				setState(PhoneState.READY) // transitional phase must occur first
			}
			setState(PhoneState.CONNECTED)
			setShowDialPad(true)
		} else {
			setState(PhoneState.ENDED) // will end audio playing
			setShowDialPad(false)
		}
	}, [masterCallState])

	// track call time
	useEffect(() => {
		if (phoneCallDuration >= 360) {
			// duration over 6minutes, end the call
			setMasterCallState(false) // end call
			setTimeout(() => setTranscriptionText("Call duration limited to 6minutes"), 500)
		}
	}, [phoneCallDuration])

	// main call flow
	useEffect(() => {
		let phoneDurationIntervalId: NodeJS.Timeout
		let phoneStateResetIntervalId: NodeJS.Timeout
		let j: Jane
		if (state === PhoneState.CONNECTED) {
			let startTime = +new Date()
			phoneDurationIntervalId = setInterval(() => setPhoneCallDuration(Math.floor((+new Date() -startTime) /1000)), 1000)

			console.log("running?")

			j = new Jane()
			j.register()

			j.onMessage = (message, dialPadInputNext, endCall) => {
				let writerId = +new Date()
				transcriptionWriterOwnerRef.current = writerId

				// set content to be spoken
				let tokens = message.split(" ")
				let tokenIdx = 0
				let timeIntervalId: NodeJS.Timeout

				transcriptionWriterContentRef.current = [] // new empty array (clear previous typed contents)
				setTranscriptionText("")
				setTranscriptionState(true)
				timeIntervalId = setInterval(() => {
					if (writerId !== transcriptionWriterOwnerRef.current || tokenIdx >= tokens.length) {
						// no longer the same writer OR typed finish
						return clearInterval(timeIntervalId)
					}

					transcriptionWriterContentRef.current.push(tokens[tokenIdx++])
					setTranscriptionText(transcriptionWriterContentRef.current.join(" "))
				}, 150)


				// stop any playback that is happening
				if (currentSynthPlayerRef.current) {
					currentSynthPlayerRef.current.stop()
				}

				// playback speech
				let synth = new Synthesiser(message)
				let synthTrack = synth.play()
				currentSynthPlayerRef.current = synth // set reference (so that it can be stopped in another event)
				console.log("synth track", currentSynthPlayerRef.current)

				// check if its end of call
				if (endCall) {
					// end call
					return synthTrack.then(() => {
						setMasterCallState(false) // drop the call
					})
				}


				// start recorder
				console.log("dialPadInputNext", dialPadInputNext)
				if (!dialPadInputNext) {
					// not expecting dialpad
					return newSession(j) // new session
				}

				// listen to pad input
				setDialPadContent("") // reset input
				let localSuppliedInputDebounce = true
				dialPadFinishCbRef.current = (finalDialPadContent: string) => {
					// only meant to be called once
					if (!localSuppliedInputDebounce) {
						// debounce for safe measures --> maybe dialPadFinishCbRef wasn't unset fast enough before next input triggered call again
						return
					}
					dialPadFinishCbRef.current = undefined // unset reference so that it can only be called once

					// TODO: retry if input fails to satisfy /^\d{7}#\d{7}#$/
					j.supplyInput(finalDialPadContent)
				}

				console.log("Jane:", message)
			}
			j.start()

			// set up recorder
			newSession(j) // start asap
		}
		if (state === PhoneState.ENDED) {
			// cleanup recorder instance if present
			console.log("cleaning up?", currentRecorderRef.current)
			if (currentRecorderRef.current) {
				console.log("ref exists")
				currentRecorderRef.current.stopRecording()
				currentRecorderRef.current.cleanup()
				currentRecorderRef.current = undefined // unset reference
			}
			if (currentSynthPlayerRef.current) {
				// stop audio playback
				currentSynthPlayerRef.current.stop()
			}

			// clean up transcription state
			transcriptionWriterOwnerRef.current = +new Date() // prevent old writer from updating
			setTranscriptionText("") // set empty
			setTranscriptionState(true)

			// set state to be ready again
			phoneStateResetIntervalId = setTimeout(() => {
				console.log("resetin")
				setPhoneCallDuration(0) // reset
				setState(PhoneState.READY)
			}, 6000)
		}

		return () => {
			if (phoneDurationIntervalId) {
				clearInterval(phoneDurationIntervalId)
			}
			if (phoneStateResetIntervalId) {
				clearTimeout(phoneStateResetIntervalId)
			}
			if (j) {
				j.cleanup()
			}
			if (currentRecorderRef.current) {
				// clean up previous recorder
				currentRecorderRef.current.stopRecording()
				currentRecorderRef.current.cleanup()
				currentRecorderRef.current = undefined // unset
			}
		}
	}, [state])

	return (
		<PhoneContext.Provider value={{state, setState, isLoading, setIsLoading, phoneCallDuration, setPhoneCallDuration, showDialPad, setShowDialPad, dialPadContent, setDialPadContent, transcriptionText, transcriptionState, masterCallState, setMasterCallState, isRecorderListening: isListening}}>
			<div className="grow flex flex-col items-center">
				<img className={`transition-all ${isLoading ? `grow p-24` : `box-content p-4 basis-6 shrink-0 grow-0 min-h-0 w-1/3`}`} src={logo.src} />
				{
					!isLoading && <DialWindow />
				}
			</div>
		</PhoneContext.Provider>
	)
}