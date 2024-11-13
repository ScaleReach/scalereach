"use server"

import { v2 } from "@google-cloud/translate"
import textToSpeech from "@google-cloud/text-to-speech"

import config from "@/app/config"

const googleTranslateClient = new v2.Translate();
const googleSynthesisClient = new textToSpeech.TextToSpeechClient();

let langList = ["en", "zh-CN", "ms", "ta", "hi"] as const
let languageCodes = ["en-GB", "cmn-CN", "ms-MY", "ta-IN", "hi-IN"]
let voiceNames = ["en-GB-Neural2-B", "cmn-CN-Wavenet-C", "ms-MY-Wavenet-A", "ta-IN-Standard-A", "hi-IN-Neural2-B"]

let langDict = {
	"en": {
		name: "English"
	},
	"zh-CN": {
		name: "Mandarin"
	},
	"ms": {
		name: "Bahasa Malaysia"
	},
	"ta": {
		name: "Tamil"
	},
	"hi": {
		name: "Hindi"
	}
}

export async function translateText(text: string, to: number) {
	if (text.length >= 1000) {
		// safety guard to prevent API abuse
		return
	}
	let [ translations ] = await googleTranslateClient.translate(text, langList[to]);
	let translationsList = Array.isArray(translations) ? translations : [translations];

	return translationsList[0]
}

export async function synthesis(text: string, lang: number) {
	if (text.length >= 1000) {
		// safety guard to prevent API abuse
		return
	}
	const request = {
		input: { text },
		voice: { languageCode: languageCodes[lang], name: voiceNames[lang], ssmlGender: "MALE" as const },
		audioConfig: { audioEncoding: "MP3" as "MP3", speakingRate: 0.8 },
	};

	const [ response ] = await googleSynthesisClient.synthesizeSpeech(request);

	if (response.audioContent == null || typeof response.audioContent === "string") {
		return
	} else {
		return response.audioContent
	}
}