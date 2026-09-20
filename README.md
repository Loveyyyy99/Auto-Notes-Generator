# Auto Notes Generator: Hybrid YouTube Lecture Summarization System

---

## Overview
Auto Notes Generator is an NLP system that converts a YouTube lecture into structured study notes.

The project combines classical machine learning and transformer based neural summarization.  
First, the system identifies important sentences using a trained classifier. These sentences are then used to guide a neural summarization model, producing notes that retain factual content while improving readability.

The objective is to reduce hallucination in abstractive summarization while avoiding the rigid structure of extractive summaries.

---

## Methodology

The system performs the following stages:

1. Download audio from a YouTube video  
2. Convert speech to text using Whisper  
3. Detect the input language (English or Hindi)  
4. Predict important sentences using classification  
5. Predict optimal summary length using regression  
6. Generate extractive summary  
7. Generate improved abstractive summary using BART  
8. Translate results when required using mBART  
9. Evaluate output using ROUGE and structural metrics

---

## Sentence Importance Classification

The `CNN/DailyMail` dataset is converted into a sentence classification dataset using weak supervision.

A sentence is labeled important if its token overlap with the reference summary exceeds 40 percent.

### Features used:
1. TF-IDF representation (5000 features)  
2. Sentence length  
3. Sentence position  
4. Keyword indicators (definition, important, conclusion, etc.)

### Models evaluated:
1. Logistic Regression  
2. Naive Bayes  
3. KNN  
4. Linear SVM  
5. Random Forest  
6. MLP Neural Network

   <img width="1218" height="674" alt="image" src="https://github.com/user-attachments/assets/8b541f67-54ae-4619-8db0-3fde71e5da0c" />


Class imbalance is handled using balanced training and threshold tuning.


---

## Summary Length Prediction

The system predicts the number of sentences required in the final summary.

### Input features:
- Article word count  
- Sentence count  
- Average sentence length

### Models used:
- Linear Regression  
- Polynomial Regression

   <img width="1193" height="308" alt="image" src="https://github.com/user-attachments/assets/28ea2c70-bfde-41ab-88d4-bb7c7a6d5791" />


---

## Abstractive Summarization

Model used: `facebook/bart-large-cnn`

Two outputs are generated:
- Normal abstractive summary  
- Extractive guided abstractive summary

The extractive summary is provided as context to the transformer to improve factual grounding.

---

## Multilingual Support

Model used: `facebook/mbart-large-50-many-to-many-mmt`

- Hindi to English translation for summarization  
- English to Hindi translation for final notes

---

## Speech Recognition

Model used: `openai/whisper-small`

Chunk based transcription is implemented to reduce memory usage.

---

## Dataset

Primary dataset: `CNN/DailyMail v3.0.0`

Used for:
- Sentence importance labeling  
- Regression training  
- Evaluation using ROUGE

---

## Evaluation Metrics

### Text similarity:
- ROUGE-1  
- ROUGE-2  
- ROUGE-L  

### Regression:
- RMSE  
- MAE  
- R² score  

### Structural quality:
- Compression ratio  
- Summary length statistics

<img width="1172" height="393" alt="image" src="https://github.com/user-attachments/assets/9afe3504-4dd4-47ce-9f82-0c54088fd27a" />

<img width="1321" height="682" alt="image" src="https://github.com/user-attachments/assets/e88c2836-18de-4cfe-a089-35487aa6a463" />


---

## Running the Project

### Step 1: Install dependencies:

`pip install -r requirements.txt`

### Step 2: Install FFmpeg (Required for audio processing)

Windows:
1. Download from [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/)
2. Extract the folder
3. Copy the "bin" folder path
4. Add it to System Environment Variables → Path
5. Restart terminal

### Step 3: Run the notebook and execute all cells sequentially.

### Step 4: To generate notes, modify the YouTube link in the final cell:

`YOUTUBE_URL = "your_link_here"`

The system outputs:
- Extractive summary  
- Abstractive summary  
- Improved hybrid summary

---

## Output Files

- `auto_notes_output_comparison.txt`  
- `summary_evaluation_results.png`

---

## Applications

- Lecture note generation  
- Revision material preparation  
- Educational accessibility  
- Multilingual learning assistance

---

## Conclusion

The hybrid approach improves factual reliability compared to pure abstractive models while remaining more readable than extractive summaries.  
The system demonstrates that classical machine learning can effectively guide neural summarization for academic note generation.
