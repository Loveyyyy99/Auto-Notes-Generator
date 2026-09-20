// These types mirror the AutoNotes.ipynb pipeline exactly:
//  - GenerateRequest  -> args of generate_auto_notes_hybrid(youtube_url, output_language, audio_language)
//  - PipelineResult   -> the dict returned by generate_auto_notes_hybrid (Cell 17)
// Keep this in sync with the notebook if the pipeline's output shape changes.

export type OutputLanguage = "english" | "hindi";
export type AudioLanguage = "en" | "hi" | null;
export type DetectedLanguage = "en" | "hi";

export interface GenerateRequest {
  youtube_url: string;
  output_language: OutputLanguage;
  audio_language: AudioLanguage;
}

export interface PipelineResult {
  transcript_original: string;
  majority_lang: DetectedLanguage;
  abstractive_en: string;
  improved_abstractive_en: string;
  extractive_en: string;
  abstractive_hi: string;
  improved_abstractive_hi: string;
  extractive_hi: string;
  summary_length_suggested: number;
}

export interface ApiError {
  error: string;
}
