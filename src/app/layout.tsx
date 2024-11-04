import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import localFont from "next/font/local";
import "./globals.css";

const coolvetica = localFont({
	src: "./fonts/coolvetica.otf",
	variable: "--font-cool"
});
const inter = Inter({
	subsets: ['latin'],
	variable: "--font-inter"
});

export const metadata: Metadata = {
	title: "ScaleReach - Contact Us",
	description: "",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${coolvetica.variable} ${inter.variable} font-sans antialiased h-svh max-h-svh min-h-0 flex flex-col`}
			>
				{children}
			</body>
		</html>
	);
}
