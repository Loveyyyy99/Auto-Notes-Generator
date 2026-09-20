"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AudioLanguage, GenerateRequest, OutputLanguage, PipelineResult } from "@/lib/types";

const PRESETS = [
  { url: "https://youtu.be/kiiA6WTCQn0", label: "Op-Amp Basics (sample run)" },
];

export default function UploadPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("english");
  const [audioLanguage, setAudioLanguage] = useState<"auto" | "en" | "hi">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Paste a YouTube link first.");
      return;
    }

    setError(null);
    setLoading(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

    const payload: GenerateRequest = {
      youtube_url: url.trim(),
      output_language: outputLanguage,
      audio_language: audioLanguage === "auto" ? null : (audioLanguage as AudioLanguage),
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed.");
      }

      const result = data as PipelineResult;
      sessionStorage.setItem("autonotes_result", JSON.stringify(result));
      sessionStorage.setItem("autonotes_source_url", url.trim());
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-gutter py-space-xl lg:py-space-2xl">
      <div className="mb-space-xl">
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mb-space-2xs">
          Generate Study Notes from YouTube
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          Paste a lecture link. The pipeline downloads audio, transcribes it with Whisper, and
          produces extractive, abstractive, and hybrid notes.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest rounded-xl shadow-md p-space-md sm:p-space-lg mb-space-lg"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-xs">
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-space-sm flex items-center justify-center pointer-events-none text-error">
              <span className="material-symbols-outlined text-[22px]">play_circle</span>
            </div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md rounded-lg pl-11 pr-10 py-3 outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 transition-all placeholder:text-outline"
              placeholder="Paste YouTube lecture link..."
              type="url"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-space-xs px-space-lg py-3 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md shadow-sm hover:bg-primary active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            )}
            <span>{loading ? "Generating..." : "Generate Notes"}</span>
          </button>
        </div>

        <div className="mt-space-md pt-space-md bg-surface-container-low/60 -mx-space-md -mb-space-md sm:-mx-space-lg sm:-mb-space-lg p-space-sm rounded-b-xl grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div className="flex flex-col gap-space-2xs">
            <span className="font-label-xs text-label-xs text-on-surface-variant font-medium uppercase tracking-wider">
              Output language (output_language)
            </span>
            <div className="inline-flex p-1 bg-surface-container-highest rounded-lg gap-1">
              {(["english", "hindi"] as OutputLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setOutputLanguage(lang)}
                  className={`px-space-sm py-1 rounded-md font-label-md text-label-md transition-all ${
                    outputLanguage === lang
                      ? "bg-surface-container-lowest text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {lang === "english" ? "English" : "Hindi (हिंदी)"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-space-2xs">
            <span className="font-label-xs text-label-xs text-on-surface-variant font-medium uppercase tracking-wider">
              Audio language (audio_language)
            </span>
            <div className="inline-flex p-1 bg-surface-container-highest rounded-lg gap-1">
              {(["auto", "en", "hi"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setAudioLanguage(lang)}
                  className={`px-space-sm py-1 rounded-md font-label-md text-label-md transition-all ${
                    audioLanguage === lang
                      ? "bg-surface-container-lowest text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {lang === "auto" ? "Auto-detect" : lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>

      <div className="flex flex-col sm:flex-row sm:items-center gap-space-xs sm:gap-space-sm mb-space-2xl">
        <span className="font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
          Or try:
        </span>
        <div className="flex flex-wrap items-center gap-space-xs">
          {PRESETS.map((p) => (
            <button
              key={p.url}
              type="button"
              onClick={() => setUrl(p.url)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high hover:text-primary transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[15px] text-outline">school</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container rounded-xl p-space-md mb-space-lg font-body-sm text-body-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary-container text-[22px] animate-spin">
            progress_activity
          </span>
          <div>
            <p className="font-body-md-medium text-on-surface">
              Downloading audio, transcribing, and summarizing... ({elapsed}s)
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              This genuinely takes a few minutes depending on video length and whether the backend
              has a GPU — there is no fake progress bar here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
