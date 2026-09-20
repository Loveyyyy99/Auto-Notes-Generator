# AutoNotes

A Next.js 14 (App Router + TypeScript + Tailwind) rebuild of the original landing / upload / results mockups, wired to the **real** output shape of `AutoNotes.ipynb`'s `generate_auto_notes_hybrid()` — no fabricated telemetry, WER numbers, or fake progress bars.

<!--
  =========================================================
  SCREENSHOT: Hero / banner shot of the app
  Suggested size: 1200x600
  =========================================================
-->
<img width="1918" height="912" alt="image" src="https://github.com/user-attachments/assets/6d4b9b8d-3792-4c6d-8d93-ca9fc8545014" />


---

## Table of Contents

- [Architecture](#architecture)
- [Field Mapping](#field-mapping)
- [Screenshots](#screenshots)
- [Running the Frontend](#running-the-frontend)
- [Wiring Up the Real Pipeline](#wiring-up-the-real-pipeline)
- [Pages](#pages)

---

## Architecture

```
Next.js app (this project)  --POST /api/generate-->  FastAPI wrapper (/pipeline_server)
                                                              |
                                                       pipeline.py
                                                   (extracted from AutoNotes.ipynb,
                                                    Cells 1–17: generate_auto_notes_hybrid)
```

The pipeline itself (Whisper / BART / mBART / sklearn) still runs exactly as it does in the notebook. The FastAPI server just exposes `generate_auto_notes_hybrid()` over HTTP so the Next.js app has something to call.

---

## Field Mapping

`generate_auto_notes_hybrid()` returns this dict (Cell 17) — `lib/types.ts` mirrors it exactly, and the results page reads every field from it directly:

| Notebook field | Results page usage |
| --- | --- |
| `transcript_original` | "Full transcript" accordion, word-count stat |
| `majority_lang` | "Detected Language" stat (`EN` / `HI`) |
| `abstractive_en` | Abstractive tab |
| `improved_abstractive_en` | Hybrid tab (default) |
| `extractive_en` | Extractive tab |
| `abstractive_hi` / `improved_abstractive_hi` / `extractive_hi` | Same tabs, English/Hindi toggle (only shown if non-empty) |
| `summary_length_suggested` | "Suggested length" stat + raw output panel |

Nothing on the results page is hardcoded — word counts and the compression ratio are computed client-side from the actual strings returned.

---

## Screenshots

### 🏠 Landing Page

<!--
  SCREENSHOT: Landing page (/ ) — hero, real ROUGE numbers from evaluation_report.txt
-->
<img width="1918" height="912" alt="image" src="https://github.com/user-attachments/assets/6d4b9b8d-3792-4c6d-8d93-ca9fc8545014" />
<img width="1918" height="907" alt="image" src="https://github.com/user-attachments/assets/e39a7a41-823d-4e70-83cc-eb024338435a" />
<img width="1918" height="910" alt="image" src="https://github.com/user-attachments/assets/b01c67c2-1200-43a0-92a0-619ac95aea82" />


### 📤 Upload Page

<!--
  SCREENSHOT: Upload page (/upload) — youtube_url / output_language / audio_language form
-->
<img width="1918" height="910" alt="image" src="https://github.com/user-attachments/assets/742f62a7-bf55-4a63-b305-28525664490f" />


### 📊 Results Page

<!--
  SCREENSHOT: Results page (/results) — tabs for Abstractive / Hybrid / Extractive, stats, transcript accordion
-->
<img width="1918" height="911" alt="image" src="https://github.com/user-attachments/assets/84444f28-4ee0-463a-8b96-322f13ee73b6" />
<img width="1918" height="911" alt="image" src="https://github.com/user-attachments/assets/fcb2098b-0ab5-4cb2-a98c-29f8d08211c9" />
<img width="1917" height="910" alt="image" src="https://github.com/user-attachments/assets/bc57bddf-e5d0-46e2-b882-44d36033c452" />
<img width="1918" height="911" alt="image" src="https://github.com/user-attachments/assets/9268e6ac-23e7-4525-ad3f-2e6376888d4e" />

## Running the Frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

By default `.env.local` has `USE_MOCK_DATA=true`, so `/upload` will return real sample output from your own `auto_notes_output_comparison.txt` run (the op-amp lecture) without needing the ML pipeline running. This is only for previewing the UI.

---

## Wiring Up the Real Pipeline

1. Copy `AutoNotes.ipynb` into `pipeline_server/`.
2. Extract and run the pipeline server:

   ```bash
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

> **Note:** `pipeline.py` loads Whisper + BART + mBART at import time (same as the notebook), so the first request to the FastAPI server will be slow while models load — subsequent requests reuse the already-loaded models.

---

## Pages

| Route | Description |
| --- | --- |
| `/` | Landing page — real ROUGE numbers from `evaluation_report.txt`, not invented stats |
| `/upload` | Form for `youtube_url` / `output_language` / `audio_language`, posts to `/api/generate`, stores the result in `sessionStorage`, redirects to `/results` |
| `/results` | Reads the stored `PipelineResult` and renders it; shows a "No notes yet" state if you land here without generating first |
| `/api/generate` | Server route; forwards to `PIPELINE_API_URL` or serves mock data |

---

<p align="center">
  <sub>Built on top of <code>AutoNotes.ipynb</code> — no fabricated stats, ever.</sub>
</p>
