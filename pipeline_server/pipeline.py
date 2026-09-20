# ---- Cell 1 ----
# CELL 1 — Install packages 



!pip install -q yt-dlp mlxtend
!pip install -q transformers datasets evaluate sentencepiece accelerate
!pip install -q librosa pydub langdetect soundfile
!pip install -q scikit-learn pandas numpy scipy matplotlib seaborn
!pip install -q torch --index-url https://download.pytorch.org/whl/cpu
!pip install -q absl-py rouge-score protobuf

# NLTK data
import nltk
nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)

print("Packages installed (or previously present).")


# ---- Cell 2 ----
# CELL 2 — Imports & device
import os, sys, re, glob, subprocess, shlex, warnings, time
from pathlib import Path
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd

import torch
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Device:", device)

# HF / audio / NLP
from transformers import (
    WhisperProcessor, WhisperForConditionalGeneration,
    AutoTokenizer, AutoModelForSeq2SeqLM,
    MBartForConditionalGeneration, MBart50TokenizerFast,
)
from datasets import load_dataset
import evaluate

import librosa
from yt_dlp import YoutubeDL

from langdetect import detect, DetectorFactory
DetectorFactory.seed = 0

# NLTK
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize

# sklearn + helpers
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.cluster import KMeans

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_squared_error, mean_absolute_error, r2_score, classification_report, confusion_matrix
)

from scipy.sparse import csr_matrix, hstack, vstack

# Association rules
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import apriori, association_rules

print("Imports ready.")


# ---- Cell 3 ----
# CELL 3 — Text cleaning & keywords
def clean_text_basic(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = text.replace("\n", " ").strip()
    return re.sub(r"\s+", " ", text)

KEYWORDS = [
    "definition", "important", "key point", "in summary",
    "conclusion", "therefore", "result", "note that", "remember"
]

print("Text utilities ready.")


# ---- Cell 4 ----
# CELL 4 — Download YouTube audio & ffmpeg conversion
def download_youtube_audio(video_url, out_dir="downloads", filename_stem="audio"):
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    outtmpl = os.path.join(out_dir, f"{filename_stem}.%(ext)s")
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": outtmpl,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "retries": 3,
        "postprocessors": [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}
        ],
    }
    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            base = os.path.join(out_dir, filename_stem)
            # find the mp3
            candidates = glob.glob(base + ".mp3")
            if candidates:
                print("Audio saved to", candidates[0])
                return candidates[0]
            ext = info.get("ext", "mp3")
            guessed = f"{base}.{ext}"
            if os.path.exists(guessed):
                print("Audio saved to", guessed)
                return guessed
    except Exception as e:
        print("yt-dlp download failed:", e)
        return None

def to_wav16k_mono(in_path, out_path="downloads/audio_clean.wav"):
    Path(os.path.dirname(out_path)).mkdir(parents=True, exist_ok=True)
    try:
        cmd = f'ffmpeg -y -i {shlex.quote(in_path)} -ac 1 -ar 16000 -vn -f wav {shlex.quote(out_path)}'
        subprocess.run(cmd, shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return out_path
    except Exception as e:
        print("ffmpeg conversion failed (ffmpeg must be in PATH). Falling back to original:", e)
        return in_path

print("YouTube/ffmpeg helpers ready.")


# ---- Cell 5 ----
# CELL 5 — Whisper setup & transcribe
print("Loading Whisper model (small)")
whisper_processor = None
whisper_model = None
try:
    whisper_model_id = "openai/whisper-small"
    whisper_processor = WhisperProcessor.from_pretrained(whisper_model_id)
    whisper_model = WhisperForConditionalGeneration.from_pretrained(whisper_model_id).to(device)
    print("Whisper loaded.")
except Exception as e:
    print("Whisper load failed:", e)
    print("You can continue but ASR-dependent steps will fail until Whisper loads.")

def _detect_lang_code(text: str) -> str:
    if not text or not text.strip():
        return "en"
    try:
        code = detect(text)
        return "hi" if code.startswith("hi") else "en"
    except Exception:
        return "en"

def transcribe_chunks(audio_path, language=None, chunk_seconds=10):
    if whisper_processor is None or whisper_model is None:
        raise RuntimeError("Whisper not loaded.")
    wav_path = to_wav16k_mono(audio_path)
    y_full, sr = librosa.load(wav_path, sr=16000, mono=True)
    probe = y_full[:30*sr]
    feats = whisper_processor(probe, sampling_rate=sr, return_tensors="pt").input_features.to(device)
    seq = whisper_model.generate(feats, do_sample=False, temperature=0.0)
    first_text = whisper_processor.batch_decode(seq, skip_special_tokens=True)[0].strip()
    auto_lang = _detect_lang_code(first_text)
    lang_forced = language if language in ("en","hi") else auto_lang
    print(f"Auto-detected: {auto_lang.upper()} → Forcing: {lang_forced.upper()}")
    forced_ids = whisper_processor.get_decoder_prompt_ids(language=lang_forced, task="transcribe")
    step = chunk_seconds * sr
    results = []
    for i in range(0, len(y_full), step):
        chunk = y_full[i:i+step]
        if len(chunk) < sr: continue
        inputs = whisper_processor(chunk, sampling_rate=sr, return_tensors="pt").input_features.to(device)
        gen = whisper_model.generate(
            inputs,
            forced_decoder_ids=forced_ids,
            do_sample=False, temperature=0.0, num_beams=1,
            no_repeat_ngram_size=3, repetition_penalty=1.15, length_penalty=1.0
        )
        text = whisper_processor.batch_decode(gen, skip_special_tokens=True)[0].strip()
        if text:
            results.append({"text": text, "lang": lang_forced})
    return results

def transcribe_audio(audio_path, language=None):
    print(" Transcribing audio in chunks...")
    chunks = transcribe_chunks(audio_path, language=language, chunk_seconds=10)
    full_text = " ".join(c["text"] for c in chunks).strip()
    maj = "hi" if sum(c["lang"]=="hi" for c in chunks) > len(chunks)/2 else "en"
    print("Chunk-majority language:", maj)
    return full_text, maj, chunks

print("Whisper transcription helpers ready (if model loaded).")


# ---- Cell 6 ----
# CELL 6 — BART (abstractive) + mBART (translation)
print("Loading BART (facebook/bart-large-cnn).")
summ_tokenizer_en = None
summ_model_en = None
try:
    summ_tokenizer_en = AutoTokenizer.from_pretrained("facebook/bart-large-cnn")
    summ_model_en = AutoModelForSeq2SeqLM.from_pretrained("facebook/bart-large-cnn").to(device)
    print("BART loaded.")
except Exception as e:
    print("Failed to load BART:", e)

print("Loading mBART-50 for EN<->HI translation (may require protobuf).")
mbart_tokenizer = None
mbart_model = None
try:
    mbart_name = "facebook/mbart-large-50-many-to-many-mmt"
    mbart_tokenizer = MBart50TokenizerFast.from_pretrained(mbart_name)
    mbart_model = MBartForConditionalGeneration.from_pretrained(mbart_name).to(device)
    print("mBART-50 loaded.")
except Exception as e:
    print("mBART load failed (protobuf may be missing):", e)
    print("If you need Hindi translation, run: pip install protobuf and restart the kernel.")

def translate_text_mb(text: str, src_lang: str, tgt_lang: str, max_len: int = 1024) -> str:
    if mbart_tokenizer is None or mbart_model is None:
        raise RuntimeError("mBART not loaded.")
    text = clean_text_basic(text)
    if not text:
        return ""
    mbart_tokenizer.src_lang = src_lang
    enc = mbart_tokenizer(text, return_tensors="pt", truncation=True, max_length=max_len).to(device)
    gen = mbart_model.generate(
        **enc,
        forced_bos_token_id=mbart_tokenizer.lang_code_to_id[tgt_lang],
        max_length=min(1024, max_len+50)
    )
    return mbart_tokenizer.batch_decode(gen, skip_special_tokens=True)[0]


# ---- Cell 7 ----
# CELL 7 — Abstractive summary & improved abstractive by feeding extractive summary

def generate_abstractive_summary(text: str, max_tokens: int = 256) -> str:
    """
    Basic BART summarization on English text. If summ_model_en not available, returns "".
    """
    if summ_model_en is None or summ_tokenizer_en is None:
        print("BART not loaded; cannot generate abstractive summary.")
        return ""
    text = clean_text_basic(text)
    if not text:
        return ""
    inputs = summ_tokenizer_en(text, max_length=1024, truncation=True, return_tensors="pt").to(device)
    summary_ids = summ_model_en.generate(
        inputs['input_ids'],
        max_length=max_tokens, min_length=60, num_beams=4, length_penalty=2.0, early_stopping=True
    )
    return summ_tokenizer_en.decode(summary_ids[0], skip_special_tokens=True)

def generate_improved_abstractive(extractive_summary: str, original_transcript: str, max_tokens: int = 256) -> str:
    """
    Take the extractive summary (short) and original transcript, and ask BART to generate
    a refined abstractive summary by providing the extractive summary as context.
    Approach: create a prompt: [EXTRACTIVE SUMMARY]\n\n[TRANSCRIPT]
    This gives BART a concise content highlight to guide the abstractive generation.
    """
    if summ_model_en is None or summ_tokenizer_en is None:
        print("BART not loaded; cannot produce improved abstractive summary.")
        return ""
    # prepare prompt: extractive prefixed (short), then transcript
    prompt = ""
    if extractive_summary and len(extractive_summary.strip()) > 10:
        prompt = f"ExtractiveSummary: {clean_text_basic(extractive_summary)}\n\nTranscript: {clean_text_basic(original_transcript)}"
    else:
        prompt = clean_text_basic(original_transcript)
    # Truncate prompt if too long
    prompt = prompt[:30000]  # be conservative
    inputs = summ_tokenizer_en(prompt, max_length=1024, truncation=True, return_tensors="pt").to(device)
    summary_ids = summ_model_en.generate(
        inputs['input_ids'],
        max_length=max_tokens, min_length=60, num_beams=4, length_penalty=2.0, early_stopping=True
    )
    return summ_tokenizer_en.decode(summary_ids[0], skip_special_tokens=True)

print("Abstractive and improved-abstractive functions ready.")


# ---- Cell 8 ----
# CELL 8 — Load cnn_dailymail dataset for supervised extractive training
print("Loading CNN/DailyMail (may take time to download)...")
try:
    cnn_data = load_dataset("abisee/cnn_dailymail", "3.0.0")
    train_raw = cnn_data["train"]
    val_raw = cnn_data["validation"]
    test_raw = cnn_data["test"]
    print("Loaded CNN/DailyMail splits. Sizes:", len(train_raw), len(val_raw), len(test_raw))
except Exception as e:
    print("Failed to load cnn_dailymail:", e)
    train_raw = val_raw = test_raw = None


# ---- Cell 9 ----
# CELL 9 — Build sentence-importance dataset for sentence classifier
NUM_DOCS_FOR_SENTENCES = 2000
OVERLAP_THRESHOLD = 0.4

def sentence_overlaps_summary(sent: str, summary: str, threshold: float = OVERLAP_THRESHOLD) -> int:
    sent_tokens = set([t.lower() for t in word_tokenize(sent) if t.isalnum()])
    if not sent_tokens:
        return 0
    summ_tokens = set([t.lower() for t in word_tokenize(summary) if t.isalnum()])
    overlap = len(sent_tokens & summ_tokens) / len(sent_tokens)
    return 1 if overlap >= threshold else 0

def build_sentence_importance_dataset(dataset, num_docs=NUM_DOCS_FOR_SENTENCES, overlap_threshold=OVERLAP_THRESHOLD):
    sentences = []
    labels = []
    lengths = []
    positions = []
    keyword_flags = []
    n_docs = min(num_docs, len(dataset))
    for i in range(n_docs):
        art = dataset[i]["article"]
        summ = dataset[i]["highlights"]
        if not art or not summ:
            continue
        art_clean = clean_text_basic(art)
        summ_clean = clean_text_basic(summ)
        sents = sent_tokenize(art_clean)
        total = len(sents)
        if total == 0:
            continue
        for idx, s in enumerate(sents):
            s_clean = clean_text_basic(s)
            if not s_clean:
                continue
            label = sentence_overlaps_summary(s_clean, summ_clean, threshold=overlap_threshold)
            sentences.append(s_clean)
            labels.append(label)
            lengths.append(len(s_clean.split()))
            positions.append(idx / total)
            keyword_flags.append(1 if any(kw in s_clean.lower() for kw in KEYWORDS) else 0)
    print(f"Built sentence dataset: {len(sentences)} sentences. Important: {sum(labels)}")
    return sentences, np.array(labels), np.array(lengths), np.array(positions), np.array(keyword_flags)

if train_raw is not None:
    sentences_all, labels_all, lengths_all, positions_all, keyword_flags_all = build_sentence_importance_dataset(train_raw, num_docs=NUM_DOCS_FOR_SENTENCES, overlap_threshold=OVERLAP_THRESHOLD)
else:
    sentences_all = labels_all = lengths_all = positions_all = keyword_flags_all = None


# ---- Cell 10 ----
# CELL 10 — TF-IDF + numeric features + train/val/test split
MAX_TFIDF_FEATURES = 5000

if sentences_all is None:
    print("No sentence dataset. Re-run dataset load.")
else:
    tfidf_sent = TfidfVectorizer(max_features=MAX_TFIDF_FEATURES, stop_words="english")
    X_tfidf_sent = tfidf_sent.fit_transform(sentences_all)
    numeric_feats = np.vstack([lengths_all, positions_all, keyword_flags_all]).T
    numeric_sparse = csr_matrix(numeric_feats)
    X_all = hstack([X_tfidf_sent, numeric_sparse])
    y_all = labels_all

    X_temp, X_test_s, y_temp, y_test_s = train_test_split(X_all, y_all, test_size=0.15, random_state=42, stratify=y_all)
    val_ratio = 0.15 / 0.85
    X_train_s, X_val_s, y_train_s, y_val_s = train_test_split(X_temp, y_temp, test_size=val_ratio, random_state=42, stratify=y_temp)

    print("Split sizes: Train", X_train_s.shape, "Val", X_val_s.shape, "Test", X_test_s.shape)


# ---- Cell 11 ----
# CELL 11 — Train classical classifiers + MLP (pick best by val F1)
results_sentence_cls = []

def eval_classification_model(model, name, X_tr, y_tr, X_val, y_val, X_te, y_te):
    model.fit(X_tr, y_tr)
    def metrics(X,y):
        y_pred = model.predict(X)
        return {
            "accuracy": accuracy_score(y, y_pred),
            "precision": precision_score(y, y_pred, zero_division=0),
            "recall": recall_score(y, y_pred, zero_division=0),
            "f1": f1_score(y, y_pred, zero_division=0)
        }
    val_m = metrics(X_val, y_val)
    test_m = metrics(X_te, y_te)
    print(f"[{name}] Val F1: {val_m['f1']:.4f}, Test F1: {test_m['f1']:.4f}")
    return {"name": name, "model": model, "val": val_m, "test": test_m}

models_to_try = [
    ("Logistic Regression", LogisticRegression(max_iter=1000)),
    ("Naïve Bayes", MultinomialNB()),
    ("KNN (k=5)", KNeighborsClassifier(n_neighbors=5)),
    ("Linear SVM", LinearSVC(max_iter=10000)),
    ("Random Forest", RandomForestClassifier(n_estimators=100, random_state=42))
]

for name, m in models_to_try:
    try:
        res = eval_classification_model(m, name, X_train_s, y_train_s, X_val_s, y_val_s, X_test_s, y_test_s)
        results_sentence_cls.append(res)
    except Exception as e:
        print("Failed training", name, ":", e)

# MLP (shallow)
try:
    X_tr_dense = X_train_s.toarray()
    X_val_dense = X_val_s.toarray()
    X_test_dense = X_test_s.toarray()
    max_mlp_samples = 8000
    if X_tr_dense.shape[0] > max_mlp_samples:
        X_tr_mlp = X_tr_dense[:max_mlp_samples]; y_tr_mlp = y_train_s[:max_mlp_samples]
    else:
        X_tr_mlp = X_tr_dense; y_tr_mlp = y_train_s
    mlp = MLPClassifier(hidden_layer_sizes=(64,), max_iter=20, random_state=42)
    mlp_res = eval_classification_model(mlp, "MLP (Shallow)", X_tr_mlp, y_tr_mlp, X_val_dense, y_val_s, X_test_dense, y_test_s)
    results_sentence_cls.append(mlp_res)
except Exception as e:
    print("Skipping MLP due to:", e)

# Summarize and pick best by validation F1
df_models = []
for r in results_sentence_cls:
    df_models.append({"name": r["name"], "val_f1": r["val"]["f1"], "val_acc": r["val"]["accuracy"], "val_prec": r["val"]["precision"], "val_rec": r["val"]["recall"]})
df_models = pd.DataFrame(df_models).sort_values("val_f1", ascending=False).reset_index(drop=True)
print("\nModel comparison (validation):")
print(df_models.to_string(index=False))

best_model_name = df_models.loc[0, "name"]
best_entry = next(r for r in results_sentence_cls if r["name"] == best_model_name)
final_sentence_model = best_entry["model"]
print("Selected best model by validation F1:", best_model_name)


# ---- Cell 12 ----
# CELL 12 — Fusion attempt and retrain balanced models + threshold tuning on val

# Fusion of top-3 by val_f1
top_k = min(3, len(df_models))
top_models = df_models.head(top_k)["name"].tolist()
fusion_models = [(r["name"], r["model"]) for r in results_sentence_cls if r["name"] in top_models]

def fusion_predict_proba(models, X):
    probs = []
    for name, m in models:
        if hasattr(m, "predict_proba"):
            p = m.predict_proba(X)[:,1]
        elif hasattr(m, "decision_function"):
            df = m.decision_function(X)
            p = 1/(1+np.exp(-df))
        else:
            p = m.predict(X).astype(float)
        probs.append(p)
    avg = np.vstack(probs).mean(axis=0)
    return avg

use_fusion = False
try:
    fusion_probs_val = fusion_predict_proba(fusion_models, X_val_s)
    fusion_preds_val = (fusion_probs_val >= 0.5).astype(int)
    fusion_f1 = f1_score(y_val_s, fusion_preds_val, zero_division=0)
    best_val_f1 = df_models.loc[0, "val_f1"]
    if fusion_f1 > best_val_f1:
        use_fusion = True
        print("Fusion outperforms best single model on val. Using fusion.")
    else:
        print("Fusion did not improve validation F1; will use single best model.")
except Exception as e:
    print("Fusion failed:", e)
    use_fusion = False

# Retrain balanced Logistic and RandomForest and tune threshold on validation
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

X_tr = X_train_s; X_val = X_val_s; X_te = X_test_s
y_tr = y_train_s; y_val = y_val_s; y_te = y_test_s

lr_bal = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
lr_bal.fit(X_tr, y_tr)
rf_bal = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42, n_jobs=-1)
rf_bal.fit(X_tr, y_tr)

retrained_models = {"LogisticBalanced": lr_bal, "RandomForestBalanced": rf_bal}

def get_probs(model, X):
    if hasattr(model, "predict_proba"):
        return model.predict_proba(X)[:,1]
    elif hasattr(model, "decision_function"):
        return 1/(1+np.exp(-model.decision_function(X)))
    else:
        return model.predict(X).astype(float)

best_results = {}
for name, m in retrained_models.items():
    probs_val = get_probs(m, X_val)
    best = (0.0, 0.5, 0.0, 0.0)
    for t in np.linspace(0.01, 0.99, 99):
        preds = (probs_val >= t).astype(int)
        f1t = f1_score(y_val, preds, zero_division=0)
        if f1t > best[0]:
            best = (f1t, t, precision_score(y_val, preds, zero_division=0), recall_score(y_val, preds, zero_division=0))
    best_results[name] = best
    print(f"{name}: best VAL F1 {best[0]:.4f} @ thresh {best[1]:.3f} (prec {best[2]:.3f}, rec {best[3]:.3f})")

# pick best retrained model
best_name = max(best_results.keys(), key=lambda k: best_results[k][0])
best_f1, best_thresh, _, _ = best_results[best_name]
best_model = retrained_models[best_name]
probs_test = get_probs(best_model, X_te)
preds_test = (probs_test >= best_thresh).astype(int)
print(f"\n*** Final chosen retrained model: {best_name} (val F1 {best_f1:.4f}) ***")
print("Test set classification report:")
print(classification_report(y_te, preds_test, zero_division=0))
print("Confusion matrix (test):\n", confusion_matrix(y_te, preds_test))

# Lock final model and threshold
final_sentence_model = best_model
best_threshold = float(best_thresh)
print("Final model:", type(final_sentence_model).__name__, "threshold:", best_threshold)


# ---- Cell 13 ----
# CELL 13 — featurize_sentences_for_importance (used by extractive builder)
def featurize_sentences_for_importance(sent_list):
    if not sent_list:
        return None
    if 'tfidf_sent' not in globals():
        raise RuntimeError("tfidf_sent not found. Re-run TF-IDF cell (Cell 10).")
    sent_list_clean = [clean_text_basic(s) for s in sent_list]
    total = max(1, len(sent_list_clean))
    lengths = np.array([len(s.split()) for s in sent_list_clean], dtype=float)
    positions = np.array([i/total for i in range(total)], dtype=float)
    keyword_flags = np.array([1 if any(kw in s.lower() for kw in KEYWORDS) else 0 for s in sent_list_clean], dtype=float)
    X_tfidf = tfidf_sent.transform(sent_list_clean)
    numeric = np.vstack([lengths, positions, keyword_flags]).T
    numeric_sparse = csr_matrix(numeric)
    X_feat = hstack([X_tfidf, numeric_sparse], format='csr')
    return X_feat

print("featurize_sentences_for_importance ready.")


# ---- Cell 14 ----
# CELL 14 — Build regression dataset & train linear / polynomial regressors
def build_regression_dataset(dataset, num_docs=1500):
    doc_features = []
    targets = []
    n_docs = min(num_docs, len(dataset))
    for i in range(n_docs):
        art = dataset[i]["article"]; summ = dataset[i]["highlights"]
        if not art or not summ: continue
        art_clean = clean_text_basic(art); summ_clean = clean_text_basic(summ)
        art_sents = sent_tokenize(art_clean); summ_sents = sent_tokenize(summ_clean)
        num_words_art = len(art_clean.split()); num_sents_art = len(art_sents)
        avg_sent_len = num_words_art / num_sents_art if num_sents_art>0 else 0
        num_sents_summ = len(summ_sents)
        if num_sents_art==0 or num_sents_summ==0: continue
        doc_features.append([num_words_art, num_sents_art, avg_sent_len])
        targets.append(num_sents_summ)
    X = np.array(doc_features, dtype=float); y = np.array(targets, dtype=float)
    print("Regression dataset:", X.shape[0], "docs")
    return X,y

if train_raw is not None:
    X_reg_all, y_reg_all = build_regression_dataset(train_raw, num_docs=1500)
    X_temp_r, X_test_r, y_temp_r, y_test_r = train_test_split(X_reg_all, y_reg_all, test_size=0.15, random_state=42)
    val_ratio_r = 0.15 / 0.85
    X_train_r, X_val_r, y_train_r, y_val_r = train_test_split(X_temp_r, y_temp_r, test_size=val_ratio_r, random_state=42)
    # Linear and polynomial
    lin = LinearRegression(); lin.fit(X_train_r, y_train_r)
    from sklearn.metrics import mean_squared_error
    def reg_metrics(model, X, y):
        pred = model.predict(X)
        return np.sqrt(mean_squared_error(y,pred)), np.mean(np.abs(y-pred)), r2_score(y,pred)
    print("Linear val RMSE, MAE, R2:", reg_metrics(lin, X_val_r, y_val_r))
    poly = Pipeline([("poly", PolynomialFeatures(degree=2, include_bias=False)), ("lin", LinearRegression())])
    poly.fit(X_train_r, y_train_r)
    print("Poly val RMSE, MAE, R2:", reg_metrics(poly, X_val_r, y_val_r))
    # choose best by val RMSE
    if reg_metrics(lin, X_val_r, y_val_r)[0] <= reg_metrics(poly, X_val_r, y_val_r)[0]:
        final_reg_model = lin
        print("Selected Linear Regression for length prediction.")
    else:
        final_reg_model = poly
        print("Selected Polynomial Regression for length prediction.")
else:
    final_reg_model = None
    print("No training dataset for regression.")


# ---- Cell 15 ----
# CELL 15 — KMeans clustering on article corpus + Apriori association rules
def build_article_corpus(dataset, num_docs=300):
    arts = []
    for i in range(min(num_docs, len(dataset))):
        a = dataset[i]["article"]
        if a: arts.append(clean_text_basic(a))
    return arts

if train_raw is not None:
    articles_for_cluster = build_article_corpus(train_raw, num_docs=300)
    tfidf_art = TfidfVectorizer(max_features=5000, stop_words="english")
    X_art = tfidf_art.fit_transform(articles_for_cluster)
    k = 5
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels_cluster = kmeans.fit_predict(X_art)
    print("KMeans cluster sizes:", np.bincount(labels_cluster))
    # top terms per cluster (centroids)
    try:
        feat = tfidf_art.get_feature_names_out()
        for c in range(k):
            centroid = kmeans.cluster_centers_[c]
            top_idx = centroid.argsort()[::-1][:10]
            print(f"Cluster {c} top terms:", ", ".join(feat[j] for j in top_idx))
    except Exception:
        pass

    # Association rules (Apriori) from top TF-IDF keywords per article
    def build_transactions_from_articles(articles, top_k_terms=8):
        vec = TfidfVectorizer(max_features=3000, stop_words="english")
        X = vec.fit_transform(articles)
        feature_names = vec.get_feature_names_out()
        transactions = []
        for i in range(X.shape[0]):
            row = X[i].toarray().ravel()
            top_idx = row.argsort()[::-1][:top_k_terms]
            terms = [feature_names[j] for j in top_idx]
            transactions.append(list(set(terms)))
        return transactions
    transactions = build_transactions_from_articles(articles_for_cluster, top_k_terms=8)
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df_trans = pd.DataFrame(te_ary, columns=te.columns_)
    freq_items = apriori(df_trans, min_support=0.05, use_colnames=True)
    rules = association_rules(freq_items, metric="confidence", min_threshold=0.6)
    print("Apriori rules (top 5):")
    print(rules.sort_values("confidence", ascending=False).head(5))
else:
    print("Skipping clustering/Apriori — no dataset.")


# ---- Cell 16 ----
# CELL 16 — Build extractive summary from sentences using tuned model & threshold
def suggest_summary_length_from_reg(transcript: str) -> int:
    text = clean_text_basic(transcript)
    sents = sent_tokenize(text)
    if not sents:
        return 1
    num_words = len(text.split())
    num_sents = len(sents)
    avg_len = num_words / num_sents if num_sents>0 else 0
    if 'final_reg_model' in globals() and final_reg_model is not None:
        try:
            X_feat = np.array([[num_words, num_sents, avg_len]], dtype=float)
            pred = final_reg_model.predict(X_feat)[0]
            pred = max(1, int(round(pred)))
            return pred
        except Exception:
            pass
    return max(1, int(round(num_words / 100.0)))

def build_extractive_summary_from_sentences(sentences, target_len=None, threshold=None, pad_with_top=True):
    if not sentences:
        return ""
    if threshold is None:
        threshold = globals().get('best_threshold', 0.5)
    if target_len is None:
        target_len = suggest_summary_length_from_reg(" ".join(sentences))
    X_feat = featurize_sentences_for_importance(sentences)
    if X_feat is None:
        return ""
    model = final_sentence_model
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_feat)[:,1]
    elif hasattr(model, "decision_function"):
        df = model.decision_function(X_feat)
        probs = 1/(1+np.exp(-df))
    else:
        preds = model.predict(X_feat).astype(float); probs = preds
    probs = np.asarray(probs).ravel()
    idxs_above = np.where(probs >= threshold)[0].tolist()
    if len(idxs_above) > target_len:
        idxs_sorted = sorted(idxs_above, key=lambda i: probs[i], reverse=True)[:target_len]
    elif len(idxs_above)==0 and pad_with_top:
        idxs_sorted = list(np.argsort(probs)[::-1][:target_len])
    else:
        idxs_sorted = list(sorted(idxs_above))
        if pad_with_top and len(idxs_sorted) < target_len:
            remaining = [i for i in np.argsort(probs)[::-1] if i not in idxs_sorted]
            to_add = remaining[: max(0, target_len - len(idxs_sorted))]
            idxs_sorted = sorted(idxs_sorted + to_add)
    chosen = [sentences[i] for i in idxs_sorted]
    return " ".join(chosen)

print("Extractive builder ready (uses final_sentence_model and best_threshold).")


# ---- Cell 17 ----
# CELL 17 — Hybrid pipeline: deep abstractive + classical extractive + improved abstractive
def generate_auto_notes_hybrid(youtube_url, output_language="english", audio_language=None):
    print("="*70); print("AUTO-NOTES HYBRID (Deep + Classical + Improved BART)"); print("="*70)
    # download
    audio_path = download_youtube_audio(youtube_url)
    if not audio_path:
        print("Download failed.")
        return None
    # transcribe
    try:
        transcript_original, maj_lang, chunks = transcribe_audio(audio_path, language=audio_language)
    except Exception as e:
        print("Transcription failed:", e)
        return None
    print("\nOriginal Transcript (snippet):", transcript_original[:300], "...\n")
    # Deep abstractive (EN) + mBART HI if requested
    input_lang = "hi" if maj_lang=="hi" else "en"
    # If transcript in Hindi and mBART available, translate to English for BART
    transcript_for_bart = transcript_original
    if maj_lang=="hi":
        if mbart_model is not None:
            try:
                transcript_for_bart = translate_text_mb(clean_text_basic(transcript_original), src_lang="hi_IN", tgt_lang="en_XX")
            except Exception as e:
                print("Translation to EN failed:", e)
        else:
            transcript_for_bart = clean_text_basic(transcript_original)
    # BART abstractive
    abstractive_en = ""
    if summ_model_en is not None:
        abstractive_en = generate_abstractive_summary(transcript_for_bart, max_tokens=256)
        print("Abstractive (BART) summary generated.")
    else:
        print("BART not available; skipping abstractive.")
    # Extractive (classical)
    # Prepare English sentences for extractive pipeline (if transcript in HI and mbart exists we already translated)
    transcript_en_for_ml = transcript_for_bart
    sentences_en = sent_tokenize(transcript_en_for_ml)
    target_len = suggest_summary_length_from_reg(transcript_en_for_ml)
    extractive_en = build_extractive_summary_from_sentences(sentences_en, target_len=target_len, threshold=best_threshold)
    print("Extractive summary (classical) generated.")
    # Improved abstractive: feed extractive -> BART to refine abstractive
    improved_abstractive_en = ""
    if summ_model_en is not None:
        improved_abstractive_en = generate_improved_abstractive(extractive_en, transcript_for_bart, max_tokens=256)
        print("Improved abstractive (BART with extractive context) generated.")
    # Optional translate outputs to Hindi (if requested)
    abstractive_hi = ""
    improved_abstractive_hi = ""
    extractive_hi = ""
    if output_language.lower().startswith("hi"):
        if mbart_model is not None:
            try:
                abstractive_hi = translate_text_mb(abstractive_en, src_lang="en_XX", tgt_lang="hi_IN") if abstractive_en else ""
            except Exception:
                abstractive_hi = ""
            try:
                improved_abstractive_hi = translate_text_mb(improved_abstractive_en, src_lang="en_XX", tgt_lang="hi_IN") if improved_abstractive_en else ""
            except Exception:
                improved_abstractive_hi = ""
            try:
                extractive_hi = translate_text_mb(extractive_en, src_lang="en_XX", tgt_lang="hi_IN") if extractive_en else ""
            except Exception:
                extractive_hi = ""
        else:
            print("mBART not available; skipping Hindi translations.")
    # Compose results
    result = {
        "transcript_original": transcript_original,
        "majority_lang": maj_lang,
        "abstractive_en": abstractive_en,
        "improved_abstractive_en": improved_abstractive_en,
        "extractive_en": extractive_en,
        "abstractive_hi": abstractive_hi,
        "improved_abstractive_hi": improved_abstractive_hi,
        "extractive_hi": extractive_hi,
        "summary_length_suggested": target_len
    }
    print("Hybrid pipeline complete.")
    return result

print("Hybrid wrapper ready.")

