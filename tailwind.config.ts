import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				background: "var(--background)",
				foreground: "var(--foreground)",
				color: "var(--color)",
				accent: "#fb8733",
				green: "#82bd8e",
				red: "#f54747",
				"black-accent": "rgb(124 124 124)"
			},
			fontFamily: {
				sans: [`var(--font-cool)`],
				inter: [`var(--font-inter)`]
			}
		},
	},
	plugins: [
		plugin(function({ addVariant }) {
			addVariant("hocus", ["&:hover", "&:focus"])
			addVariant("hacus", ["&:hover", "&:focus", "&.active"])
		})
	],
	darkMode: "class",
};
export default config;
