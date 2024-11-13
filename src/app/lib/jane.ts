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
	onMessage?: (message: string) => void

	constructor() {
		this.ready = false
		this.started = false

		this.msgHistory = []
	}

	async register() {
		/**
		 * register a new session
		 * 
		 * 1. obtain new api key
		 * 
		 * returns null if failed
		 */
		let authResponse = await axios<any, { key: string }>({
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
			timeout: 1000,
			headers: { [config.JANE.HEADER]: authKey }
		})
		this.ready = true
	}

	async start() {
		this.started = true

		// add greeeter dialogue entry
		this.addDialogue(Speaker.System, "Hello, I am Jane from OCBC, how may I help you?")
	}

	private addDialogue(speaker, content) {
		this.msgHistory.push([speaker, content])
		if (this.onMessage) {
			this.onMessage(content)
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

		let response = await this.bridge.post("/chat", prompt)
		if (response.status !== 200) {
			console.log("response.status", response.status)
			return
		}

		console.log("response", response.data)
		this.msgHistory.push([Speaker.User, prompt])
		if (response.data.message) {
			addDialogue(Speaker.System, response.data.message)
		}
	}
}