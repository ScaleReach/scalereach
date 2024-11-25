/**
 * adapter code interacts with Jane
 */
import axios, { AxiosInstance, AxiosResponse } from "axios"
import config from "@/app/config"
import { Console } from "console"

export enum Speaker {
	System,
	User
}

export class Jane {
	ready: boolean
	started: boolean
	bridge?: AxiosInstance

	msgHistory: [Speaker, string][]
	onMessage?: (message: string, dialPadActionNext: boolean) => void
	isDialPadInputNext: boolean
	dialPadActionId?: number

	constructor() {
		this.ready = false
		this.started = false

		this.msgHistory = []
		this.isDialPadInputNext = false // set to true to prevent listening to input
	}

	async register() {
		/**
		 * register a new session
		 * 
		 * 1. obtain new api key
		 * 
		 * returns null if failed
		 */
		let authResponse = await axios<{ key: string }>({
			method: "get",
			url: `${config.JANE.URL}/chat/new`
		})
		if (authResponse.status !== 200) {
			console.log("authResponse.status", authResponse.status)
			return
		}

		let authKey = authResponse.data.key
		if (!authKey) {
			console.log("authKey null", authResponse.data)
			return
		}

		this.bridge = axios.create({
			baseURL: config.JANE.URL,
			timeout: 600000, // 10min timeout
			headers: { [config.JANE.HEADER]: authKey }
		})
		this.ready = true
	}

	async start() {
		this.started = true

		// add greeeter dialogue entry
		this.addDialogue(Speaker.System, "Hello, I am Jane from OCBC, how may I help you?")
	}

	private addDialogue(speaker: Speaker, content: string) {
		this.msgHistory.push([speaker, content])
		if (this.onMessage) {
			this.onMessage(content, this.isDialPadInputNext)
		}
	}

	async chat(prompt: string) {
		/**
		 * responds to dialogue
		 */
		if (!this.bridge) {
			console.log("bridge not set")
			return
		}

		let response = await this.bridge.post<{ type: number, spokenResponse: string, inputId?: number }>("/chat", prompt, {
			headers: {
				"Content-Type": "text/plain"
			}
		})
		if (response.status !== 200) {
			console.log("response.status", response.status)
			return
		}

		console.log("response", response.data)
		if (response.data.type === 5) {
			// expecting dial pad input, expect 100% correctness in params from server (.inputId shhould be present when type === 5)
			this.isDialPadInputNext = true
			this.dialPadActionId = response.data.inputId!
		}

		this.msgHistory.push([Speaker.User, prompt])
		this.addDialogue(Speaker.System, response.data.spokenResponse)
	}

	async supplyInput(input: string) {
		/**
		 * supplies dial pad input
		 */
		if (!this.isDialPadInputNext) {
			// not expecting input
			return
		}
		if (!this.bridge) {
			console.log("bridge not set")
			return
		}

		// unset
		this.isDialPadInputNext = false

		let response = await this.bridge.post(`/chat/supply/${this.dialPadActionId}`, {
			headers: {
				"Content-Type": "text/plain"
			}
		})
		if (response.status !== 200) {
			console.log("input response.status", response.status)
			return
		}

		console.log("dialpad input response", response.data)
		this.addDialogue(Speaker.System, response.data.spokenResponse)
	}
}