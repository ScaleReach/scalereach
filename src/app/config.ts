let development = {
	COOKIE_NAME: "monster",

	JANE: {
		URL: "http://localhost:3000",
		HEADER: "x-jane-key"
	}
}

let production = {
	COOKIE_NAME: "monster",

	JANE: {
		URL: "http://localhost:3000",
		HEADER: "x-jane-key"
	}
}

export default process.env.NODE_ENV === "production" ? production : development