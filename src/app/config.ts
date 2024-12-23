let development = {
	COOKIE_NAME: "monster",

	JANE: {
		URL: "http://localhost:3000",
		HEADER: "x-jane-key"
	},

	ASR: {
		URL: "ws://localhost:3002/recognition"
	}
}

let production = {
	COOKIE_NAME: "monster",

	JANE: {
		URL: "https://scalereach.team:6732",
		HEADER: "x-jane-key"
	},

	ASR: {
		URL: "wss://scalereach.team:6733/recognition"
	}
}

export default process.env.NODE_ENV === "production" ? production : development