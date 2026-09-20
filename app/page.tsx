import Link from "next/link";

// Real numbers pulled from evaluation_report.txt (this project's own eval run on
// CNN/DailyMail test samples) — not placeholder marketing stats.
const ROUGE = [
  { name: "Abstractive (BART)", r1: 0.348, r2: 0.152, rl: 0.26 },
  { name: "Improved (Extractive→BART)", r1: 0.33, r2: 0.135, rl: 0.235 },
  { name: "Extractive (Classical ML)", r1: 0.295, r2: 0.108, rl: 0.203 },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[480px] bg-gradient-to-b from-primary/5 via-surface-container-high/40 to-transparent blur-3xl pointer-events-none rounded-full" />

        {/* Hero */}
        <section className="relative max-w-7xl mx-auto px-gutter pt-space-2xl pb-space-3xl flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-space-xs px-space-sm py-1.5 rounded-full bg-surface-container-low shadow-sm mb-space-md">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-label-xs text-label-xs text-on-surface uppercase tracking-wider font-semibold">
              Whisper + BART &amp; mBART hybrid pipeline
            </span>
          </div>

          <h1 className="font-display-hero text-display-hero text-on-surface max-w-4xl tracking-tight mb-space-sm text-balance">
            Turn any lecture into structured study notes
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-space-xl text-balance">
            Paste a YouTube lecture link and get extractive, abstractive, and hybrid notes — grounded
            by a classical-ML sentence classifier and refined with BART, with optional Hindi
            translation via mBART-50.
          </p>

          <div className="w-full max-w-2xl bg-surface-container-lowest p-space-xs rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-space-xs">
            <div className="flex items-center gap-space-xs px-space-sm flex-1 w-full">
              <span className="material-symbols-outlined text-outline text-[20px]">smart_display</span>
              <span className="w-full font-mono-code text-mono-code text-outline/70 py-space-xs">
                Paste a YouTube lecture link...
              </span>
            </div>
            <Link
              href="/upload"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-3.5 rounded-xl bg-primary-container text-on-primary font-body-md-medium text-body-md shadow-sm hover:bg-primary transition-all whitespace-nowrap active:scale-[0.98]"
            >
              <span>Generate Notes</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          <div className="mt-space-md flex flex-wrap items-center justify-center gap-space-md text-on-surface-variant font-label-md text-label-md">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary-container text-[16px]">translate</span>
              English &amp; Hindi output
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[16px]">tune</span>
              Extractive, abstractive &amp; hybrid modes
            </span>
          </div>
        </section>
      </div>

      {/* Pipeline stages */}
      <section className="max-w-7xl mx-auto px-gutter py-space-3xl w-full">
        <div className="text-center max-w-2xl mx-auto mb-space-2xl">
          <span className="font-label-xs text-label-xs uppercase tracking-widest text-primary-container font-semibold">
            Pipeline
          </span>
          <h2 className="font-headline-xl text-headline-xl text-on-surface mt-space-xs">
            Nine stages, from audio to notes
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-lg">
          {[
            { icon: "download", title: "1–3. Ingest & Transcribe", body: "Download audio with yt-dlp, transcribe in 10–30s chunks with Whisper-small, and auto-detect English vs. Hindi." },
            { icon: "filter_alt", title: "4–6. Extractive Pass", body: "TF-IDF + sentence position/length/keyword features feed a classical classifier (best of Logistic Regression, Random Forest, MLP, etc.) tuned by validation F1, plus a regressor that predicts target summary length." },
            { icon: "auto_awesome", title: "7–9. Abstractive & Translate", body: "The extractive summary is fed as context into BART for a grounded abstractive rewrite, optionally translated with mBART-50 for Hindi output, and scored with ROUGE." },
          ].map((s) => (
            <div key={s.title} className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary mb-space-md">
                <span className="material-symbols-outlined text-[26px]">{s.icon}</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-xs">{s.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Real benchmarks */}
      <section className="w-full bg-surface-container py-space-3xl">
        <div className="max-w-7xl mx-auto px-gutter">
          <div className="text-center max-w-2xl mx-auto mb-space-2xl">
            <span className="font-label-xs text-label-xs uppercase tracking-widest text-primary-container font-semibold">
              Evaluation
            </span>
            <h2 className="font-headline-xl text-headline-xl text-on-surface mt-space-xs">
              ROUGE scores on CNN/DailyMail test samples
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">
              From this project&apos;s own evaluation run (evaluation_report.txt) — not marketing copy.
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/40">
                  <th className="px-space-lg py-space-sm font-label-md text-label-md text-on-surface-variant">Summary type</th>
                  <th className="px-space-lg py-space-sm font-label-md text-label-md text-on-surface-variant">ROUGE-1</th>
                  <th className="px-space-lg py-space-sm font-label-md text-label-md text-on-surface-variant">ROUGE-2</th>
                  <th className="px-space-lg py-space-sm font-label-md text-label-md text-on-surface-variant">ROUGE-L</th>
                </tr>
              </thead>
              <tbody>
                {ROUGE.map((row) => (
                  <tr key={row.name} className="border-b border-outline-variant/20 last:border-0">
                    <td className="px-space-lg py-space-sm font-body-md-medium text-on-surface">{row.name}</td>
                    <td className="px-space-lg py-space-sm font-mono-code text-on-surface-variant">{row.r1.toFixed(3)}</td>
                    <td className="px-space-lg py-space-sm font-mono-code text-on-surface-variant">{row.r2.toFixed(3)}</td>
                    <td className="px-space-lg py-space-sm font-mono-code text-on-surface-variant">{row.rl.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-gutter py-space-3xl w-full">
        <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary-container to-tertiary-container rounded-3xl p-space-xl lg:p-space-2xl text-on-primary shadow-xl">
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl flex flex-col items-start gap-space-md">
            <h2 className="font-headline-xl text-headline-xl lg:text-[36px] font-semibold text-white tracking-tight leading-tight">
              Try it on your next lecture
            </h2>
            <p className="font-body-lg text-body-lg text-white/80 max-w-xl">
              Paste a link, pick a language, and get extractive, abstractive, and hybrid notes side
              by side.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-space-xs px-space-xl py-space-sm rounded-xl bg-surface-container-lowest text-primary font-body-md-medium text-body-md shadow-md hover:bg-white hover:scale-[1.02] transition-all"
            >
              <span>Start Generating</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
