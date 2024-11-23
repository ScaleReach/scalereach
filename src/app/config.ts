let development = {
	COOKIE_NAME: "monster",

	JANE: {
		URL: "http://localhost:3000",
		HEADER: "x-jane-key"
	},

	ASR: {
		URL: "ws://localhost:3002"
	}
}

let production = {
	COOKIE_NAME: "monster",

	JANE: {
		URL: "http://localhost:3000",
		HEADER: "x-jane-key"
	},

	ASR: {
		URL: "wss://localhost:3002"
	}
}

export default process.env.NODE_ENV === "production" ? production : development