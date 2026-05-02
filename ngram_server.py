"""
N-Gram Model — FastAPI Server
Run:  python ngram_server.py
Docs: http://localhost:8000/docs
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from ngram_model import (
    get_model,
    init_model,
    tokenize,
    predict_with_info,
    generate_step,
    generate_sentence,
)


# ── Lifespan: train model on startup ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_model()
    yield


app = FastAPI(title="N-Gram 3D Visualization API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response schemas ──
class PredictRequest(BaseModel):
    text: str = Field(..., examples=["the world"])
    top_k: int = Field(5, ge=1, le=15)
    temperature: float = Field(0.7, ge=0.1, le=3.0)
    view_mode: str = Field("both", pattern="^(both|bigram|trigram)$")


class StepRequest(BaseModel):
    text: str = Field(..., examples=["the world"])
    temperature: float = Field(0.7, ge=0.1, le=3.0)
    top_k: int = Field(5, ge=1, le=15)
    view_mode: str = Field("both", pattern="^(both|bigram|trigram)$")


class GenerateRequest(BaseModel):
    text: str = Field(..., examples=["the world"])
    length: int = Field(10, ge=1, le=50)
    temperature: float = Field(0.7, ge=0.1, le=3.0)


# ── Routes ──
@app.post("/api/predict")
async def predict(req: PredictRequest):
    """Return prediction info: source model, context words, candidate next-words with probabilities."""
    m = get_model()
    words = tokenize(req.text)
    if not words:
        return {"error": "No valid words in input"}

    info = predict_with_info(
        m.bigram_probs, m.trigram_probs, words,
        top_k=req.top_k, temp=req.temperature, view_mode=req.view_mode,
    )
    if not info:
        return {"error": "No prediction available for this input", "words": words}

    return {
        "words": words,
        "source": info["source"],
        "context": info["context"],
        "candidates": [{"word": w, "probability": round(p, 6)} for w, p in info["candidates"]],
    }


@app.post("/api/step")
async def step(req: StepRequest):
    """Sample one next word, append it, and return the new prediction."""
    m = get_model()
    words = tokenize(req.text)
    if not words:
        return {"error": "No valid words in input"}

    next_word = generate_step(
        m.bigram_probs, m.trigram_probs, words,
        temp=req.temperature, view_mode=req.view_mode,
    )
    if not next_word:
        return {"error": "Could not generate next word", "words": words}

    words.append(next_word)
    new_text = " ".join(words)

    info = predict_with_info(
        m.bigram_probs, m.trigram_probs, words,
        top_k=req.top_k, temp=req.temperature, view_mode=req.view_mode,
    )

    result = {
        "words": words,
        "new_word": next_word,
        "text": new_text,
    }
    if info:
        result["source"] = info["source"]
        result["context"] = info["context"]
        result["candidates"] = [{"word": w, "probability": round(p, 6)} for w, p in info["candidates"]]

    return result


@app.post("/api/generate")
async def generate(req: GenerateRequest):
    """Generate a full sentence from the starting text."""
    m = get_model()
    sentence = generate_sentence(
        m.bigram_probs, m.trigram_probs,
        req.text, length=req.length, temp=req.temperature,
    )
    return {"text": sentence, "words": sentence.split()}


@app.get("/api/model-info")
async def model_info():
    """Return model statistics."""
    m = get_model()
    return {
        "vocab_size": m.vocab_size,
        "bigram_contexts": m.bigram_count,
        "trigram_contexts": m.trigram_count,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
