"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PipelineResult } from "@/lib/types";

type Tab = "hybrid" | "abstractive" | "extractive";

function wordCount(s: string | undefined | null): number {
  if (!s) return 0;
  const trimmed = s.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function ResultsPage() {
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [tab, setTab] = useState<Tab>("hybrid");
  const [showHindi, setShowHindi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("autonotes_result");
    if (raw) {
      try {
        setResult(JSON.parse(raw) as PipelineResult);
      } catch {
        setResult(null);
      }
    }
    setSourceUrl(sessionStorage.getItem("autonotes_source_url") || "");
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-gutter py-space-3xl text-center">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-space-xs">No notes yet</h1>
        <p className="font-body-md text-on-surface-variant mb-space-md">
          Generate notes from a lecture first — this page has nothing to show until you do.
        </p>
        <Link
          href="/upload"
          className="inline-flex items-center gap-space-xs px-space-lg py-space-sm rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          Go to Generator
        </Link>
      </div>
    );
  }

  const hasHindi = Boolean(result.abstractive_hi || result.improved_abstractive_hi || result.extractive_hi);

  const contentByTab: Record<Tab, string> = {
    hybrid: (showHindi ? result.improved_abstractive_hi : result.improved_abstractive_en) || "",
    abstractive: (showHindi ? result.abstractive_hi : result.abstractive_en) || "",
    extractive: (showHindi ? result.extractive_hi : result.extractive_en) || "",
  };

  const content = contentByTab[tab];
  const transcriptWords = wordCount(result.transcript_original);
  const noteWords = wordCount(content);
  const compression = noteWords > 0 ? (transcriptWords / noteWords).toFixed(1) : "—";

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleDownloadMarkdown() {
    const md = [
      "# AutoNotes",
      "",
      sourceUrl ? `Source: ${sourceUrl}` : "",
      `Detected language: ${result!.majority_lang.toUpperCase()}`,
      `Suggested summary length: ${result!.summary_length_suggested} sentence(s)`,
      "",
      "## Hybrid (Extractive → BART)",
      result!.improved_abstractive_en || "_(not generated)_",
      "",
      "## Abstractive (BART)",
      result!.abstractive_en || "_(not generated)_",
      "",
      "## Extractive (Classical ML)",
      result!.extractive_en || "_(not generated)_",
      "",
      hasHindi ? "## Hindi (mBART-50)" : "",
      hasHindi ? result!.improved_abstractive_hi || "" : "",
    ]
      .filter((line) => line !== "")
      .join("\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "autonotes.md";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "hybrid", label: "Hybrid", icon: "merge_type" },
    { key: "abstractive", label: "Abstractive", icon: "auto_awesome" },
    { key: "extractive", label: "Extractive", icon: "format_quote" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-gutter py-space-md">
      {/* Stats strip — every number here is computed from the real result, nothing hardcoded */}
      <div className="w-full mb-space-lg rounded-xl bg-surface-container-lowest shadow-[0_1px_4px_rgba(15,23,42,0.04)] p-space-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm divide-x divide-outline-variant/30">
          <Stat
            icon="videocam"
            label="Original Transcript"
            value={`${transcriptWords.toLocaleString()} words`}
            sub={sourceUrl || "—"}
          />
          <Stat
            icon="article"
            label={`Note (${tab})`}
            value={`${noteWords.toLocaleString()} words`}
            sub={showHindi ? "Hindi (mBART-50)" : "English"}
          />
          <Stat
            icon="speed"
            label="Compression Ratio"
            value={noteWords > 0 ? `${compression}x` : "—"}
            sub="transcript words ÷ note words"
          />
          <Stat
            icon="translate"
            label="Detected Language"
            value={result.majority_lang.toUpperCase()}
            sub={`Suggested length: ${result.summary_length_suggested} sentence(s)`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
        <section className="lg:col-span-8 space-y-space-md">
          <article className="bg-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(15,23,42,0.04)] p-space-md sm:p-space-xl space-y-space-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
              <div className="bg-surface-container p-1 rounded-xl flex items-center gap-0.5">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
                      tab === t.key
                        ? "bg-surface-container-lowest text-primary shadow-sm font-body-md-medium"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-space-xs">
                {hasHindi && (
                  <div className="flex items-center rounded-lg bg-surface-container-low p-0.5">
                    <button
                      onClick={() => setShowHindi(false)}
                      className={`px-2.5 py-1 rounded font-label-xs text-label-xs ${
                        !showHindi ? "bg-surface-container-lowest text-on-surface font-semibold shadow-xs" : "text-on-surface-variant"
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setShowHindi(true)}
                      className={`px-2.5 py-1 rounded font-label-xs text-label-xs ${
                        showHindi ? "bg-surface-container-lowest text-on-surface font-semibold shadow-xs" : "text-on-surface-variant"
                      }`}
                    >
                      Hindi
                    </button>
                  </div>
                )}
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all font-label-md text-label-md"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-tertiary transition-all font-label-md text-label-md"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Markdown
                </button>
              </div>
            </div>

            {content ? (
              <p className="font-body-lg text-body-lg text-on-surface leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant italic">
                {showHindi
                  ? "No Hindi output for this mode — the pipeline only translates when output_language was set to Hindi and mBART loaded successfully."
                  : "This summary type wasn't generated (the corresponding model may not have loaded — check the backend logs)."}
              </p>
            )}
          </article>

          <details className="bg-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(15,23,42,0.04)] p-space-md">
            <summary className="cursor-pointer font-label-md text-label-md text-on-surface-variant hover:text-on-surface flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px]">subtitles</span>
              Full transcript ({transcriptWords.toLocaleString()} words)
            </summary>
            <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
              {result.transcript_original}
            </p>
          </details>
        </section>

        <aside className="lg:col-span-4 space-y-space-md sticky top-32">
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(15,23,42,0.04)] p-space-sm space-y-space-xs">
            <span className="font-label-md text-label-md text-on-surface font-semibold block pb-space-2xs">
              Pipeline output (raw)
            </span>
            <dl className="space-y-1 font-mono-code text-[12px] text-on-surface-variant">
              <div className="flex justify-between gap-2">
                <dt>majority_lang</dt>
                <dd className="text-on-surface">{result.majority_lang}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>summary_length_suggested</dt>
                <dd className="text-on-surface">{result.summary_length_suggested}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>has Hindi output</dt>
                <dd className="text-on-surface">{hasHindi ? "yes" : "no"}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(15,23,42,0.04)] p-space-sm">
            <Link
              href="/upload"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm text-body-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">refresh</span>
              Generate another lecture
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center gap-space-xs px-space-xs min-w-0">
      <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <span className="block font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">
          {label}
        </span>
        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold block truncate">
          {value}
        </span>
        <span className="block font-label-xs text-label-xs text-on-surface-variant truncate">{sub}</span>
      </div>
    </div>
  );
}
