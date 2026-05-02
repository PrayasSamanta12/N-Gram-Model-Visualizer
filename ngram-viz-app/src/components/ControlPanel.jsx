export default function ControlPanel({
  inputText,
  setInputText,
  temperature,
  setTemperature,
  topK,
  setTopK,
  viewMode,
  setViewMode,
  onPredict,
  onStep,
  onReset,
  loading,
}) {
  return (
    <>
      {/* ── Bottom control bar ── */}
      <div className="glass controls">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onPredict()}
          placeholder="Type a phrase… e.g. the world"
          spellCheck={false}
          autoComplete="off"
        />
        <button className="btn-predict" onClick={onPredict} disabled={loading}>
          Predict
        </button>
        <button className="btn-step" onClick={onStep} disabled={loading}>
          Step →
        </button>
        <button className="btn-reset" onClick={onReset}>
          Reset
        </button>
      </div>

      {/* ── Side panel ── */}
      <div className="glass side-panel">
        <label>Temperature</label>
        <div className="slider-row">
          <input
            type="range"
            min={0.1}
            max={2.0}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
          />
          <span className="val">{temperature.toFixed(2)}</span>
        </div>

        <label>Top-K Candidates</label>
        <div className="slider-row">
          <input
            type="range"
            min={2}
            max={8}
            step={1}
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value))}
          />
          <span className="val">{topK}</span>
        </div>

        <label>View Mode</label>
        <div className="toggle-group">
          {["both", "bigram", "trigram"].map((m) => (
            <button
              key={m}
              className={viewMode === m ? "active " + m : m}
              onClick={() => setViewMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="legend">
          <div className="legend-item"><span className="dot" style={{ background: "#76ff03" }} /> Input words</div>
          <div className="legend-item"><span className="dot" style={{ background: "#00e5ff" }} /> Context (lookup key)</div>
          <div className="legend-item"><span className="dot" style={{ background: "#d500f9" }} /> Predicted candidates</div>
          <div className="legend-item"><span className="dot" style={{ background: "rgba(0,229,255,0.5)" }} /> Trigram edge</div>
          <div className="legend-item"><span className="dot" style={{ background: "rgba(213,0,249,0.5)" }} /> Bigram edge</div>
        </div>
      </div>
    </>
  );
}
