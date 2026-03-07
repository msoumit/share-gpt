import * as React from "react";
import {
  BrowserSpeechRecognitionCtorModel,
  BrowserSpeechRecognitionErrorEventModel,
  BrowserSpeechRecognitionEventModel,
  BrowserSpeechRecognitionModel
} from "../../service/model";

export interface UseSpeechDictationParams {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

interface UseSpeechDictationResult {
  isDictationSupported: boolean;
  isListening: boolean;
  dictationError: string | null;
  startDictation: () => void;
  stopDictation: () => void;
}

export const useSpeechDictation = ({
  onTranscript,
  disabled = false
}: UseSpeechDictationParams): UseSpeechDictationResult => {
  const recognitionRef = React.useRef<BrowserSpeechRecognitionModel | null>(null);
  const finalTranscriptRef = React.useRef<string>("");
  const transcriptRef = React.useRef<string>("");
  const shouldInsertTranscriptOnEndRef = React.useRef<boolean>(false);
  const [isDictationSupported, setIsDictationSupported] = React.useState<boolean>(false);
  const [isListening, setIsListening] = React.useState<boolean>(false);
  const [dictationError, setDictationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const win = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionCtorModel;
      webkitSpeechRecognition?: BrowserSpeechRecognitionCtorModel;
    };

    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsDictationSupported(false);
      return;
    }

    setIsDictationSupported(true);

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: BrowserSpeechRecognitionEventModel): void => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = (result[0]?.transcript || "").trim();
        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim();
        } 
        else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      transcriptRef.current = `${finalTranscriptRef.current} ${interimTranscript}`.trim();
    };

    recognition.onerror = (event: BrowserSpeechRecognitionErrorEventModel): void => {
      setDictationError(`Dictation error: ${event.error}`);
      setIsListening(false);
      shouldInsertTranscriptOnEndRef.current = false;
    };

    recognition.onend = (): void => {
      setIsListening(false);

      if (!shouldInsertTranscriptOnEndRef.current) {
        return;
      }

      const transcript = transcriptRef.current.trim();
      if (transcript) {
        onTranscript(transcript);
      }

      shouldInsertTranscriptOnEndRef.current = false;
      finalTranscriptRef.current = "";
      transcriptRef.current = "";
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognitionRef.current?.stop();
      } 
      catch {
        // no-op
      }
    };
  }, [onTranscript]);

  const startDictation = React.useCallback((): void => {
    if (!recognitionRef.current || disabled) {
      return;
    }

    try {
      finalTranscriptRef.current = "";
      transcriptRef.current = "";
      shouldInsertTranscriptOnEndRef.current = false;
      setDictationError(null);
      recognitionRef.current.start();
      setIsListening(true);
    } 
    catch {
      setDictationError("Unable to start dictation. Please allow microphone access and try again.");
      setIsListening(false);
    }
  }, [disabled]);

  const stopDictation = React.useCallback((): void => {
    if (!recognitionRef.current) {
      return;
    }

    try {
      shouldInsertTranscriptOnEndRef.current = true;
      recognitionRef.current.stop();
    } 
    catch {
      // no-op
    }
    setIsListening(false);
  }, []);

  return {
    isDictationSupported,
    isListening,
    dictationError,
    startDictation,
    stopDictation
  };
};
