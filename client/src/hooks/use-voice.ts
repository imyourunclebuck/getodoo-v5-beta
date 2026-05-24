import { useState, useRef, useCallback, useEffect } from "react";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

const KOKORO_VOICE = "af_bella";
const KOKORO_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

let kokoroPromise: Promise<any> | null = null;

async function getKokoro() {
  if (!kokoroPromise) {
    kokoroPromise = (async () => {
      const { KokoroTTS } = await import("kokoro-js");
      const dtype = (navigator as any).gpu ? "fp32" : "q8";
      const device = (navigator as any).gpu ? "webgpu" : "wasm";
      try {
        return await KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype, device });
      } catch (e) {
        return await KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype: "q8", device: "wasm" });
      }
    })();
  }
  return kokoroPromise;
}

function audioBufferToWavBlob(audio: { audio: Float32Array; sampling_rate: number }): Blob {
  const { audio: samples, sampling_rate } = audio;
  const numChannels = 1;
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampling_rate, true);
  view.setUint32(28, sampling_rate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function useVoice() {
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const supportsRecognition = !!SpeechRecognition;
  const supportsSpeech = typeof window !== "undefined";

  const stopSpeaking = useCallback(() => {
    requestIdRef.current++;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, [stopSpeaking, stopListening]);

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(interimTranscript || finalTranscript);

      if (finalTranscript) {
        onResult(finalTranscript.trim());
        setTranscript("");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
      setTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const speakWithBrowser = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(
        (v) =>
          v.name.includes("Google UK English Female") ||
          v.name.includes("Samantha") ||
          v.name.includes("Google US English"),
      ) || voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakText = useCallback(
    async (text: string, messageId?: number) => {
      stopSpeaking();

      const cleanText = text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`]*`/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[#*_~|>]/g, "")
        .replace(/\n{2,}/g, ". ")
        .replace(/\n/g, " ")
        .trim();

      if (!cleanText) return;

      const reqId = ++requestIdRef.current;
      setIsSpeaking(true);
      if (messageId != null) setSpeakingMessageId(messageId);

      try {
        setIsLoadingVoice(true);
        const tts = await getKokoro();
        if (reqId !== requestIdRef.current) return;
        const audio = await tts.generate(cleanText, { voice: KOKORO_VOICE });
        if (reqId !== requestIdRef.current) return;

        const blob = audioBufferToWavBlob(audio);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        const el = new Audio(url);
        audioRef.current = el;
        el.onended = () => {
          if (reqId !== requestIdRef.current) return;
          setIsSpeaking(false);
          setSpeakingMessageId(null);
          if (audioUrlRef.current === url) {
            URL.revokeObjectURL(url);
            audioUrlRef.current = null;
          }
        };
        el.onerror = () => {
          if (reqId !== requestIdRef.current) return;
          setIsSpeaking(false);
          setSpeakingMessageId(null);
        };
        await el.play();
      } catch (err) {
        console.warn("Kokoro TTS failed, falling back to browser speech:", err);
        if (reqId === requestIdRef.current) {
          speakWithBrowser(cleanText);
        }
      } finally {
        setIsLoadingVoice(false);
      }
    },
    [stopSpeaking, speakWithBrowser],
  );

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode((prev) => {
      if (prev) {
        stopSpeaking();
        stopListening();
      } else {
        getKokoro().catch(() => {});
      }
      return !prev;
    });
  }, [stopSpeaking, stopListening]);

  return {
    voiceMode,
    setVoiceMode,
    toggleVoiceMode,
    isListening,
    isSpeaking,
    isLoadingVoice,
    speakingMessageId,
    transcript,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    supportsRecognition,
    supportsSpeech,
  };
}
