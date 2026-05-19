interface LandingTunePlayback {
  stop(): void;
}

interface LandingTuneOptions {
  repetitions: number;
}

type OscillatorWaveShape = OscillatorType;
type NoteName = "C3" | "G2" | "F3" | "C4" | "D4" | "E4" | "G4" | "A4" | "B4";

interface TimedNote {
  noteName: NoteName;
  offsetSeconds: number;
}

const noteFrequencies: Record<NoteName, number> = {
  C3: 130.81,
  G2: 98,
  F3: 174.61,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392,
  A4: 440,
  B4: 493.88,
};

const melodyNotes: TimedNote[] = [
  { noteName: "E4", offsetSeconds: 0 },
  { noteName: "G4", offsetSeconds: 0.3 },
  { noteName: "A4", offsetSeconds: 0.6 },
  { noteName: "G4", offsetSeconds: 0.9 },
  { noteName: "E4", offsetSeconds: 1.2 },
  { noteName: "D4", offsetSeconds: 1.5 },
  { noteName: "E4", offsetSeconds: 1.8 },
  { noteName: "G4", offsetSeconds: 2.1 },
  { noteName: "A4", offsetSeconds: 2.4 },
  { noteName: "B4", offsetSeconds: 2.7 },
  { noteName: "A4", offsetSeconds: 3 },
  { noteName: "G4", offsetSeconds: 3.3 },
  { noteName: "E4", offsetSeconds: 3.6 },
  { noteName: "D4", offsetSeconds: 3.9 },
  { noteName: "C4", offsetSeconds: 4.2 },
];

const bassNotes: TimedNote[] = [
  { noteName: "C3", offsetSeconds: 0 },
  { noteName: "C3", offsetSeconds: 0.6 },
  { noteName: "F3", offsetSeconds: 1.2 },
  { noteName: "C3", offsetSeconds: 1.8 },
  { noteName: "G2", offsetSeconds: 2.4 },
  { noteName: "G2", offsetSeconds: 3 },
  { noteName: "C3", offsetSeconds: 3.6 },
];

const tuneDurationSeconds = 4.7;
let activePlayback: LandingTunePlayback | null = null;

export function playLandingPageTune(
  options: LandingTuneOptions = { repetitions: 3 },
): LandingTunePlayback {
  activePlayback?.stop();

  if (!window.AudioContext) {
    activePlayback = createEmptyPlayback();
    return activePlayback;
  }

  const audioContext = new AudioContext();
  const oscillators: OscillatorNode[] = [];
  const startTime = audioContext.currentTime + 0.1;

  function scheduleNote(
    noteFrequency: number,
    startSeconds: number,
    durationSeconds: number,
    waveShape: OscillatorWaveShape,
    volume: number,
  ): void {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = waveShape;
    oscillator.frequency.value = noteFrequency;

    gain.gain.setValueAtTime(0, startSeconds);
    gain.gain.linearRampToValueAtTime(volume, startSeconds + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startSeconds + durationSeconds,
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startSeconds);
    oscillator.stop(startSeconds + durationSeconds);
    oscillators.push(oscillator);
  }

  function scheduleTune(repetitionIndex: number): void {
    const repetitionStartTime = startTime +
      repetitionIndex * tuneDurationSeconds;

    for (const melodyNote of melodyNotes) {
      scheduleNote(
        noteFrequencies[melodyNote.noteName],
        repetitionStartTime + melodyNote.offsetSeconds,
        0.25,
        "triangle",
        0.07,
      );
    }

    for (const bassNote of bassNotes) {
      scheduleNote(
        noteFrequencies[bassNote.noteName],
        repetitionStartTime + bassNote.offsetSeconds,
        0.5,
        "square",
        0.04,
      );
    }
  }

  for (
    let repetitionIndex = 0;
    repetitionIndex < options.repetitions;
    repetitionIndex++
  ) {
    scheduleTune(repetitionIndex);
  }

  let isStopped = false;

  function removeResumeListeners(): void {
    document.removeEventListener("pointerdown", resumeAudioContext);
    document.removeEventListener("keydown", resumeAudioContext);
  }

  function resumeAudioContext(): void {
    removeResumeListeners();
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch((error: unknown) => {
        console.error("Failed to resume landing page tune", error);
      });
    }
  }

  if (audioContext.state === "suspended") {
    document.addEventListener("pointerdown", resumeAudioContext, {
      once: true,
    });
    document.addEventListener("keydown", resumeAudioContext, { once: true });
    void audioContext.resume().catch(() => {
      // Browsers may require a visitor gesture before allowing page audio.
    });
  }

  activePlayback = {
    stop(): void {
      if (isStopped) return;

      isStopped = true;
      removeResumeListeners();

      for (const oscillator of oscillators) {
        try {
          oscillator.stop();
        } catch {
          // The oscillator may have already finished naturally.
        }
      }

      void audioContext.close().catch(() => {
        // Closing may fail if the browser has already torn down the context.
      });

      if (activePlayback === this) {
        activePlayback = null;
      }
    },
  };

  return activePlayback;
}

function createEmptyPlayback(): LandingTunePlayback {
  return {
    stop(): void {
      activePlayback = null;
    },
  };
}
