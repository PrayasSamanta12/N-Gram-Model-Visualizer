"""
N-Gram Language Model
Extracted from N-Grams.ipynb — builds bigram & trigram models from an Africa-themed dataset.
"""

import re
import math
import random
from collections import defaultdict, Counter
import pandas as pd


# ──────────────────────────────────────────
# Tokenization
# ──────────────────────────────────────────
def tokenize(text: str) -> list[str]:
    """Tokenizes text into lowercase words."""
    return re.findall(r'\b\w+\b', text.lower())


# ──────────────────────────────────────────
# Model Building
# ──────────────────────────────────────────
def build_bigram_model(dataset: list[str]) -> dict:
    model = defaultdict(Counter)
    for text in dataset:
        tokens = tokenize(text)
        for i in range(len(tokens) - 1):
            model[tokens[i]][tokens[i + 1]] += 1
    return model


def build_trigram_model(dataset: list[str]) -> dict:
    model = defaultdict(Counter)
    for text in dataset:
        tokens = tokenize(text)
        for i in range(len(tokens) - 2):
            key = (tokens[i], tokens[i + 1])
            model[key][tokens[i + 2]] += 1
    return model


def normalize_model(model: dict) -> dict:
    prob_model = {}
    for word, counter in model.items():
        total = sum(counter.values())
        prob_model[word] = {w: c / total for w, c in counter.items()}
    return prob_model


# ──────────────────────────────────────────
# Prediction
# ──────────────────────────────────────────
def sample_with_temperature(prob_dict: dict, temp: float = 1.0) -> str | None:
    if not prob_dict:
        return None
    adjusted = {w: p ** (1 / temp) for w, p in prob_dict.items()}
    total = sum(adjusted.values())
    normalized = {w: p / total for w, p in adjusted.items()}
    words = list(normalized.keys())
    probs = list(normalized.values())
    return random.choices(words, weights=probs)[0]


def get_top_k(prob_dict: dict, k: int = 5, temp: float = 1.0) -> list[tuple[str, float]]:
    if not prob_dict:
        return []
    adjusted = {w: p ** (1 / temp) for w, p in prob_dict.items()}
    total = sum(adjusted.values())
    normalized = [(w, p / total) for w, p in adjusted.items()]
    normalized.sort(key=lambda x: -x[1])
    return normalized[:k]


def predict_with_info(
    bigram_probs: dict,
    trigram_probs: dict,
    words: list[str],
    top_k: int = 5,
    temp: float = 1.0,
    view_mode: str = "both",
) -> dict | None:
    """
    Predict next word with full info about which model was used.
    Returns {source, context, candidates} or None.
    """
    info = {"source": None, "context": [], "candidates": []}

    # Try trigram first
    if view_mode != "bigram" and len(words) >= 2:
        key = (words[-2], words[-1])
        if key in trigram_probs:
            info["source"] = "trigram"
            info["context"] = [words[-2], words[-1]]
            info["candidates"] = get_top_k(trigram_probs[key], top_k, temp)

    # Fallback to bigram
    if not info["source"] and view_mode != "trigram":
        last = words[-1]
        if last in bigram_probs:
            info["source"] = "bigram"
            info["context"] = [last]
            info["candidates"] = get_top_k(bigram_probs[last], top_k, temp)

    # Trigram-only mode but no trigram match → still fall back
    if not info["source"] and view_mode == "trigram":
        last = words[-1]
        if last in bigram_probs:
            info["source"] = "bigram"
            info["context"] = [last]
            info["candidates"] = get_top_k(bigram_probs[last], top_k, temp)

    return info if info["source"] else None


def generate_step(
    bigram_probs: dict,
    trigram_probs: dict,
    words: list[str],
    temp: float = 1.0,
    view_mode: str = "both",
) -> str | None:
    """Sample a single next word."""
    info = predict_with_info(bigram_probs, trigram_probs, words, top_k=50, temp=temp, view_mode=view_mode)
    if not info:
        return None
    prob_dict = dict(info["candidates"])
    return sample_with_temperature(prob_dict, temp=1.0)  # already temp-adjusted


def generate_sentence(
    bigram_probs: dict,
    trigram_probs: dict,
    start_text: str,
    length: int = 10,
    temp: float = 1.0,
) -> str:
    words = tokenize(start_text)
    for _ in range(length):
        next_word = generate_step(bigram_probs, trigram_probs, words, temp)
        if not next_word:
            break
        words.append(next_word)
    return " ".join(words)


# ──────────────────────────────────────────
# Dataset & Training
# ──────────────────────────────────────────
class NGramModel:
    """Encapsulates a trained bigram + trigram model."""

    def __init__(self):
        self.bigram_probs: dict = {}
        self.trigram_probs: dict = {}
        self.vocab_size: int = 0
        self.bigram_count: int = 0
        self.trigram_count: int = 0

    def train(self, dataset: list[str]):
        bigram_raw = build_bigram_model(dataset)
        trigram_raw = build_trigram_model(dataset)
        self.bigram_probs = normalize_model(bigram_raw)
        self.trigram_probs = normalize_model(trigram_raw)

        all_words = set()
        for w in self.bigram_probs:
            all_words.add(w)
            all_words.update(self.bigram_probs[w].keys())
        self.vocab_size = len(all_words)
        self.bigram_count = len(self.bigram_probs)
        self.trigram_count = len(self.trigram_probs)

    @staticmethod
    def load_africa_dataset() -> list[str]:
        df = pd.read_json(
            "https://storage.googleapis.com/dm-educational/assets/ai_foundations/africa_galore.json"
        )
        return df["description"].tolist()


# Singleton model instance, trained on import
_model = NGramModel()


def get_model() -> NGramModel:
    return _model


def init_model():
    """Load dataset and train. Called once at server startup."""
    print("Loading Africa dataset...")
    dataset = NGramModel.load_africa_dataset()
    print(f"Training on {len(dataset)} paragraphs...")
    _model.train(dataset)
    print(f"Done — vocab: {_model.vocab_size}, bigrams: {_model.bigram_count}, trigrams: {_model.trigram_count}")
