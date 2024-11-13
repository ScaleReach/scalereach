"use client"

import logo from "@/public/logo.svg"
import { PhoneSlash } from "@phosphor-icons/react"
import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from "react"
import { preload } from "react-dom"

import { Jane } from "@/app/lib/jane"
import { Synthesiser } from "@/app/lib/synthesis"

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
	phoneCallDuration?: number,
	setPhoneCallDuration?: Dispatch<SetStateAction<number>>,
	showDialPad?: boolean,
	setShowDialPad?: Dispatch<SetStateAction<boolean>>
}

const PhoneContext = createContext<PhoneContext>({})

function CallBubble() {
	const { state, setState, isLoading } = useContext(PhoneContext)

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
			transitionDuration: "5s"
		}}>
			<div className="relative rounded-full w-48 h-48 box-border transition-color duration-500" style={{
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
	const { state, setState, isLoading, phoneCallDuration, setShowDialPad } = useContext(PhoneContext)

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
						if (!setState) {
							return
						}
						if (!setShowDialPad) {
							return
						}

						setState(PhoneState.ENDED)
						setShowDialPad(false)
					}}>
						<PhoneSlash size={32} />
					</button>
				) : (
					<button className="p-2" onClick={() => {
						if (!setState) {
							return
						}
						if (!setShowDialPad) {
							return
						}

						if (state === PhoneState.ENDED) {
							setState(PhoneState.READY) // transitional phase must occur first
						}
						setState(PhoneState.CONNECTED)
						setShowDialPad(true)
					}}>
						<p>Call</p>
					</button>
				)
			}
		</div>
	)
}

function DialPad() {
	const { showDialPad } = useContext(PhoneContext)
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
		<div className="grow w-full grid grid-cols-3" style={{
			animationName: "keypad-up",
			animationDuration: "1s",
			animationFillMode: "forwards",
			animationDirection: showDialPad ? "normal" : "alternate"
		}}>
			{
				keys.map((key, i) =>
					<button key={i} className="p-3 font-bold text-2xl bg-[#090909] transition-colors" style={{
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
				<CallToolbar />
			</div>
			{
				showDialPad && <DialPad />
			}
		</div>
	)
}

export default function Main() {
	const [isLoading, setIsLoading] = useState(true)
	const [state, setState] = useState(PhoneState.READY)
	const [phoneCallDuration, setPhoneCallDuration] = useState(0)
	const [showDialPad, setShowDialPad] = useState(false)

	useEffect(() => {
		let timeIntervalId = setTimeout(() => setIsLoading(false), 50)

		return () => clearTimeout(timeIntervalId)
	}, [])

	useEffect(() => {
		let phoneDurationIntervalId: NodeJS.Timeout
		let phoneStateResetIntervalId: NodeJS.Timeout
		if (state === PhoneState.CONNECTED) {
			let startTime = +new Date()
			phoneDurationIntervalId = setInterval(() => setPhoneCallDuration(Math.floor((+new Date() -startTime) /1000)), 1000)

			console.log("running?")

			const j = new Jane()
			j.register()

			j.onMessage = (message) => {
				let synth = new Synthesiser(message)
				synth.play()

				console.log("Jane:", message)
			}
			j.start()
		}
		if (state === PhoneState.ENDED) {
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
		}
	}, [state])

	return (
		<PhoneContext.Provider value={{state, setState, isLoading, setIsLoading, phoneCallDuration, setPhoneCallDuration, showDialPad, setShowDialPad}}>
			<div className="grow flex flex-col items-center">
				<img className={`transition-all ${isLoading ? `grow p-24` : `box-content p-4 basis-6 shrink-0 grow-0 min-h-0 w-1/3`}`} src={logo.src} />
				{
					!isLoading && <DialWindow />
				}
			</div>
		</PhoneContext.Provider>
	)
}