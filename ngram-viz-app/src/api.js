const API_BASE = "http://localhost:8000";

export async function predict(text, topK = 5, temperature = 0.7, viewMode = "both") {
  const res = await fetch(`${API_BASE}/api/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, top_k: topK, temperature, view_mode: viewMode }),
  });
  return res.json();
}

export async function step(text, topK = 5, temperature = 0.7, viewMode = "both") {
  const res = await fetch(`${API_BASE}/api/step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, top_k: topK, temperature, view_mode: viewMode }),
  });
  return res.json();
}

export async function generate(text, length = 10, temperature = 0.7) {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, length, temperature }),
  });
  return res.json();
}

export async function getModelInfo() {
  const res = await fetch(`${API_BASE}/api/model-info`);
  return res.json();
}
