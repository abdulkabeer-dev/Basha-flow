declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

let activeRecognition: any = null;

export function stopAllSpeech() {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch (e) {
      // Ignore errors
    }
    activeRecognition = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function recognizeSpeech(
  lang: string,
  onInterim: (text: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    stopAllSpeech();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      reject(new Error("Speech Recognition API is not supported in this browser. Please try Google Chrome."));
      return;
    }

    const recognition = new SpeechRecognition();
    activeRecognition = recognition;
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false; // We want sentence by sentence

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      onInterim(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      activeRecognition = null;
      if (event.error === 'no-speech') {
        resolve(finalTranscript);
      } else if (event.error === 'not-allowed') {
        reject(new Error("Microphone access denied. Please allow microphone permissions in your browser settings and try again."));
      } else if (event.error === 'network') {
        reject(new Error("Network error during speech recognition. Please check your internet connection."));
      } else if (event.error === 'aborted') {
        // Speech recognition stopped intentionally, no need to show error
        resolve(finalTranscript);
      } else {
        reject(new Error(`Speech recognition error (${event.error}). Please try again.`));
      }
    };

    recognition.onend = () => {
      activeRecognition = null;
      resolve(finalTranscript);
    };

    try {
      recognition.start();
    } catch (e) {
      activeRecognition = null;
      reject(e);
    }
  });
}

export function speakText(text: string, lang: string, onEnd?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    stopAllSpeech(); // Cancel any ongoing speech before starting a new one
    
    if (!window.speechSynthesis) {
      reject(new Error("Speech Synthesis API is not supported in this browser."));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95; // Slightly slower for better clarity
    utterance.pitch = 1;

    // Optional: try to find a system voice that matches the language
    const voices = window.speechSynthesis.getVoices();
    const baseLang = lang.split('-')[0];
    const targetVoice = voices.find(v => v.lang.startsWith(baseLang));
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
      resolve();
    };

    utterance.onerror = (event: any) => {
      // ignore canceled utterance errors
      if (event.error === 'canceled' || event.error === 'interrupted') {
         resolve();
         return;
      }
      reject(new Error(`Speech synthesis error: ${event.error}. Please ensure device volume is up.`));
    };

    window.speechSynthesis.speak(utterance);
  });
}

// Prefetch voices so they are available right away
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
