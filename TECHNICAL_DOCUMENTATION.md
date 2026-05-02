# N-GRAM Model Visualizer - Technical Documentation

## 1. Project Overview
This project is an interactive N-gram language model visualizer split into:
- A Python/FastAPI backend that trains bigram and trigram models and serves prediction/generation APIs.
- A React + Three.js frontend that renders the model pipeline in 3D (input tokens -> active model context -> output candidates).

Primary goal: make next-word prediction internals visible and explorable in real time.

## 2. High-Level Architecture

### Backend
- Entry point: `ngram_server.py`
- Core model logic: `ngram_model.py`
- Framework: FastAPI + Uvicorn
- Startup behavior: loads remote dataset and trains singleton model during app lifespan.

### Frontend
- App root: `ngram-viz-app/src/App.jsx`
- API client: `ngram-viz-app/src/api.js`
- 3D scene renderer: `ngram-viz-app/src/components/ThreeScene.jsx`
- UI controls: `ngram-viz-app/src/components/ControlPanel.jsx`
- Generated text display: `ngram-viz-app/src/components/GeneratedText.jsx`
- Tooling: Vite + React + @react-three/fiber + @react-three/drei + three

## 3. Repository Structure

```text
.
|- ngram_model.py                 # N-gram tokenization, training, prediction, generation
|- ngram_server.py                # FastAPI service exposing model operations
|- ngram-viz-app/
   |- package.json                # Frontend dependencies/scripts
   |- src/
      |- App.jsx                  # State orchestration and user actions
      |- api.js                   # HTTP calls to backend
      |- App.css                  # App visual styling
      |- components/
         |- ThreeScene.jsx        # 3D visualization engine
         |- ControlPanel.jsx      # Input + controls
         |- GeneratedText.jsx     # Current token sequence text bar
```

## 4. Backend Technical Details

### 4.1 Tokenization
File: `ngram_model.py`
- Function: `tokenize(text)`
- Regex: `\b\w+\b`
- Behavior:
  - Lowercases all text.
  - Extracts alphanumeric/underscore word tokens.
  - Drops punctuation.

### 4.2 Model Construction
File: `ngram_model.py`
- `build_bigram_model(dataset)`
  - Builds mapping: `word -> Counter(next_word)`
- `build_trigram_model(dataset)`
  - Builds mapping: `(word1, word2) -> Counter(next_word)`
- `normalize_model(model)`
  - Converts count-based counters to probabilities by dividing by context total.

### 4.3 Candidate Scoring and Sampling
File: `ngram_model.py`
- `get_top_k(prob_dict, k, temp)`
  - Applies temperature scaling via `p ** (1/temp)` then renormalizes.
  - Returns top K `(word, probability)` sorted descending.
- `sample_with_temperature(prob_dict, temp)`
  - Applies same temperature transform and samples with weighted random choice.

### 4.4 Prediction Fallback Logic
File: `ngram_model.py` (`predict_with_info`)
- Input: token list + `view_mode` (`both`, `bigram`, `trigram`)
- Logic:
  1. If mode allows trigram and last two tokens exist in trigram model -> use trigram.
  2. Else if mode allows bigram and last token exists in bigram model -> use bigram.
  3. Special case: in trigram-only mode, if trigram not found, backend still falls back to bigram.
- Output shape:
  - `source`: `"trigram" | "bigram"`
  - `context`: context tokens used for lookup
  - `candidates`: top-k list of `(word, probability)`

### 4.5 Text Generation
File: `ngram_model.py`
- `generate_step(...)`
  - Gets up to top 50 candidates from `predict_with_info`.
  - Samples one next token.
- `generate_sentence(...)`
  - Iteratively calls `generate_step` for requested length.

### 4.6 Model Lifecycle
File: `ngram_model.py`
- Class: `NGramModel`
- Stores:
  - `bigram_probs`, `trigram_probs`
  - `vocab_size`, `bigram_count`, `trigram_count`
- Dataset loader:
  - `load_africa_dataset()` reads JSON from:
    `https://storage.googleapis.com/dm-educational/assets/ai_foundations/africa_galore.json`
- Initialization:
  - Global singleton `_model`
  - `init_model()` loads dataset and trains at server startup.

## 5. API Specification
Base URL: `http://localhost:8000`

### 5.1 `POST /api/predict`
Predict next-token candidates for current text.

Request body:
```json
{
  "text": "the world",
  "top_k": 5,
  "temperature": 0.7,
  "view_mode": "both"
}
```

Validation constraints:
- `top_k`: `1..15`
- `temperature`: `0.1..3.0`
- `view_mode`: `both | bigram | trigram`

Success response (example):
```json
{
  "words": ["the", "world"],
  "source": "trigram",
  "context": ["the", "world"],
  "candidates": [
    { "word": "is", "probability": 0.231245 }
  ]
}
```

Error cases:
- No valid tokens -> `{ "error": "No valid words in input" }`
- No matching context -> `{ "error": "No prediction available for this input", "words": [...] }`

### 5.2 `POST /api/step`
Generates one sampled token, appends it, and optionally returns next prediction block.

Request body:
```json
{
  "text": "the world",
  "top_k": 5,
  "temperature": 0.7,
  "view_mode": "both"
}
```

Success response (example):
```json
{
  "words": ["the", "world", "is"],
  "new_word": "is",
  "text": "the world is",
  "source": "bigram",
  "context": ["is"],
  "candidates": [
    { "word": "a", "probability": 0.18 }
  ]
}
```

### 5.3 `POST /api/generate`
Generate multiple continuation tokens in one call.

Request body:
```json
{
  "text": "the world",
  "length": 10,
  "temperature": 0.7
}
```

Validation:
- `length`: `1..50`

Response:
```json
{
  "text": "the world ...",
  "words": ["the", "world", "..."]
}
```

### 5.4 `GET /api/model-info`
Returns model stats.

Response:
```json
{
  "vocab_size": 12345,
  "bigram_contexts": 4567,
  "trigram_contexts": 8901
}
```

## 6. Frontend Technical Details

### 6.1 State and Control Flow
File: `ngram-viz-app/src/App.jsx`
- Main state:
  - `inputText`, `temperature`, `topK`, `viewMode`
  - `vizData` (last backend result)
  - `loading`
- Actions:
  - `handlePredict()` -> calls `/api/predict`
  - `handleStep()` -> calls `/api/step`, replaces input text with returned appended sentence
  - `handleReset()` -> resets to default seed `"the world"`

### 6.2 API Client
File: `ngram-viz-app/src/api.js`
- Hard-coded backend base: `http://localhost:8000`
- Exported methods:
  - `predict(...)`
  - `step(...)`
  - `generate(...)`
  - `getModelInfo()`

### 6.3 Visualization Model
File: `ngram-viz-app/src/components/ThreeScene.jsx`
- Rendering layers:
  - Input layer (`Y=0`): input/context words
  - Model layer (`Y=5`): active bigram/trigram node
  - Output layer (`Y=10`): candidate words sized by probability
- Visual semantics:
  - Input token nodes (green)
  - Active context nodes (cyan)
  - Candidate nodes (magenta)
  - Curved edges from context -> model and model -> candidates
  - Probability bars over each candidate
- Camera/control:
  - Orbit controls with damping and distance/polar limits.

### 6.4 Control Panel
File: `ngram-viz-app/src/components/ControlPanel.jsx`
- Inputs:
  - free-text prompt
  - temperature slider (`0.1..2.0`)
  - top-k slider (`2..8`)
  - view mode toggle
- Buttons:
  - `Predict`
  - `Step ->`
  - `Reset`

### 6.5 Generated Text Highlighting
File: `ngram-viz-app/src/components/GeneratedText.jsx`
- Shows current token sequence.
- Highlights active context tokens used for current lookup.

## 7. Runtime and Data Flow
1. Backend process starts (`python ngram_server.py`).
2. FastAPI lifespan hook calls `init_model()`.
3. Dataset is downloaded from the remote JSON URL.
4. Bigram/trigram probability maps are built and stored in singleton model.
5. Frontend sends prediction requests based on user controls.
6. Backend responds with context source and candidates.
7. Frontend converts response into layered 3D graph.

## 8. Local Development

### 8.1 Backend Setup
From repository root:

```bash
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install fastapi uvicorn pandas
python ngram_server.py
```

Backend docs (Swagger UI): `http://localhost:8000/docs`

### 8.2 Frontend Setup
From `ngram-viz-app`:

```bash
npm install
npm run dev
```

Typical dev URL: `http://localhost:5173`

### 8.3 Production Build (Frontend)
From `ngram-viz-app`:

```bash
npm run build
npm run preview
```

## 9. Dependencies

### Backend (Python)
- `fastapi`
- `uvicorn`
- `pandas`
- Standard library: `re`, `random`, `collections`, `contextlib`

### Frontend (Node)
Defined in `ngram-viz-app/package.json`:
- Runtime:
  - `react`, `react-dom`
  - `three`
  - `@react-three/fiber`
  - `@react-three/drei`
- Tooling:
  - `vite`
  - `eslint` + plugins

## 10. Known Constraints and Risks
- Startup requires internet access for dataset download; backend will fail to train offline.
- CORS is fully open (`allow_origins=["*"]`) and should be restricted for production.
- No persistence layer; model retrains on every backend restart.
- API client base URL is hard-coded; no environment-based configuration yet.
- Error handling in frontend is console-only (no user-facing error UI).
- `src/index.css` appears to be template-era CSS and is not imported by `src/main.jsx`.

## 11. Suggested Next Technical Improvements
1. Add backend dependency manifest (`requirements.txt` or `pyproject.toml`) and pinned versions.
2. Add environment-driven API base URL (e.g., Vite `import.meta.env`).
3. Cache dataset locally or vendor a dataset snapshot for offline startup.
4. Add frontend-visible error/status messages for API failures.
5. Add tests:
   - backend unit tests for tokenization, fallback logic, temperature behavior
   - API integration tests for route contracts
   - frontend component tests for control interactions

## 12. Quick Verification Checklist
- Backend starts and prints vocab/bigram/trigram counts.
- `GET /api/model-info` returns non-zero counts.
- Frontend `Predict` displays candidates in output layer.
- `Step` appends one token to text input and updates scene.
- Switching view mode changes model source behavior in response.