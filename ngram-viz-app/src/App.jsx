import { useState, useCallback } from "react";
import ThreeScene from "./components/ThreeScene";
import ControlPanel from "./components/ControlPanel";
import GeneratedText from "./components/GeneratedText";
import { predict, step } from "./api";
import "./App.css";

export default function App() {
  const [inputText, setInputText] = useState("the world");
  const [temperature, setTemperature] = useState(0.7);
  const [topK, setTopK] = useState(5);
  const [viewMode, setViewMode] = useState("both");
  const [vizData, setVizData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const data = await predict(inputText, topK, temperature, viewMode);
      setVizData(data);
    } catch (e) {
      console.error("Predict failed:", e);
    }
    setLoading(false);
  }, [inputText, topK, temperature, viewMode]);

  const handleStep = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const data = await step(inputText, topK, temperature, viewMode);
      if (data.text) {
        setInputText(data.text);
      }
      setVizData(data);
    } catch (e) {
      console.error("Step failed:", e);
    }
    setLoading(false);
  }, [inputText, topK, temperature, viewMode]);

  const handleReset = useCallback(() => {
    setInputText("the world");
    setVizData(null);
  }, []);

  return (
    <>
      <ThreeScene data={vizData} />

      <div className="glass header">
        <h1>N-Gram Language Model — 3D Internals</h1>
        <p>Visualizing bigram &amp; trigram prediction pipeline</p>
      </div>

      <GeneratedText
        words={vizData?.words}
        context={vizData?.context}
      />

      <ControlPanel
        inputText={inputText}
        setInputText={setInputText}
        temperature={temperature}
        setTemperature={setTemperature}
        topK={topK}
        setTopK={setTopK}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onPredict={handlePredict}
        onStep={handleStep}
        onReset={handleReset}
        loading={loading}
      />
    </>
  );
}
