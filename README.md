# AutoNotes Frontend (Next.js)

A Next.js 14 (App Router + TypeScript + Tailwind) rebuild of the three uploaded
HTML mockups (landing / upload / results), wired to the **real** output shape
of `AutoNotes.ipynb`'s `generate_auto_notes_hybrid()` — no fabricated
telemetry, WER numbers, or fake progress bars.

## Architecture

```
Next.js app (this project)  --POST /api/generate-->  FastAPI wrapper (/pipeline_server)
                                                              |
                                                       pipeline.py
                                                   (extracted from AutoNotes.ipynb,
                                                    Cells 1–17: generate_auto_notes_hybrid)
```

The pipeline itself (Whisper / BART / mBART / sklearn) still runs exactly as
it does in the notebook. The FastAPI server just exposes
`generate_auto_notes_hybrid()` over HTTP so the Next.js app has something to
call.

## Field mapping

`generate_auto_notes_hybrid()` returns this dict (Cell 17) — `lib/types.ts`
mirrors it exactly, and the results page reads every field from it directly:

| Notebook field             | Results page usage                                   |
|-----------------------------|-------------------------------------------------------|
| `transcript_original`       | "Full transcript" accordion, word-count stat          |
| `majority_lang`             | "Detected Language" stat (`EN` / `HI`)                 |
| `abstractive_en`            | Abstractive tab                                       |
| `improved_abstractive_en`   | Hybrid tab (default)                                  |
| `extractive_en`             | Extractive tab                                        |
| `abstractive_hi` / `improved_abstractive_hi` / `extractive_hi` | Same tabs, English/Hindi toggle (only shown if non-empty) |
| `summary_length_suggested`  | "Suggested length" stat + raw output panel             |

Nothing on the results page is hardcoded — word counts and the compression
ratio are computed client-side from the actual strings returned.

## Running the frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

By default `.env.local` has `USE_MOCK_DATA=true`, so `/upload` will return
real sample output from your own `auto_notes_output_comparison.txt` run (the
op-amp lecture) without needing the ML pipeline running. This is only for
previewing the UI.

## Wiring up the real pipeline

1. Copy `AutoNotes.ipynb` into `pipeline_server/`.
2. ```bash
   cd pipeline_server
   python extract_pipeline.py AutoNotes.ipynb   # writes pipeline.py
   pip install -r requirements.txt               # + the notebook's own requirements.txt
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```
3. In the Next.js app's `.env.local`:
   ```
   PIPELINE_API_URL=http://localhost:8000
   USE_MOCK_DATA=false
   ```
4. Restart `npm run dev`. `/upload` now calls the real pipeline.

Note: `pipeline.py` loads Whisper + BART + mBART at import time (same as the
notebook), so the first request to the FastAPI server will be slow while
models load — subsequent requests reuse the already-loaded models.

## Pages

- `/` — landing page (real ROUGE numbers from `evaluation_report.txt`, not
  invented stats)
- `/upload` — form for `youtube_url` / `output_language` / `audio_language`,
  posts to `/api/generate`, stores the result in `sessionStorage`, redirects
  to `/results`
- `/results` — reads the stored `PipelineResult` and renders it; shows a
  "No notes yet" state if you land here without generating first
- `/api/generate` — server route; forwards to `PIPELINE_API_URL` or serves
  mock data
