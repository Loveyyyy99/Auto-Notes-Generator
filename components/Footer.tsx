export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] py-space-2xl">
      <div className="max-w-7xl mx-auto px-gutter">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter-lg mb-space-xl">
          <div className="space-y-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">AutoNotes.ai</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Hybrid classical-ML + neural summarization pipeline: Whisper for transcription, a
              trained sentence classifier for extraction, and BART/mBART for abstractive and
              multilingual synthesis.
            </p>
          </div>
          <div>
            <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-space-sm">
              Pipeline
            </h4>
            <ul className="space-y-space-2xs font-body-sm text-body-sm text-on-surface-variant">
              <li>Whisper (openai/whisper-small) ASR</li>
              <li>TF-IDF + classical ML sentence classifier</li>
              <li>BART (facebook/bart-large-cnn) abstractive core</li>
              <li>mBART-50 multilingual translation</li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-space-sm">
              Workspace
            </h4>
            <ul className="space-y-space-2xs font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <a className="hover:text-primary transition-colors" href="/upload">
                  New Lecture
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="/results">
                  Notes Viewer
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-space-sm">
              Evaluation
            </h4>
            <ul className="space-y-space-2xs font-body-sm text-body-sm text-on-surface-variant">
              <li>ROUGE-1 / ROUGE-2 / ROUGE-L</li>
              <li>Summary length regression (RMSE / MAE / R²)</li>
              <li>Compression ratio &amp; length stats</li>
            </ul>
          </div>
        </div>
        <div className="pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm font-label-xs text-label-xs text-on-surface-variant">
          <p>Built on top of the AutoNotes hybrid summarization notebook.</p>
        </div>
      </div>
    </footer>
  );
}
