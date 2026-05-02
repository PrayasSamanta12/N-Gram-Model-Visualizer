export default function GeneratedText({ words, context }) {
  if (!words || !words.length) return <div className="glass generated-text" />;

  const ctxLen = context ? context.length : 0;
  return (
    <div className="glass generated-text">
      {words.map((w, i) => {
        const isCtx = ctxLen > 0 && i >= words.length - ctxLen;
        return (
          <span key={i}>
            {i > 0 ? " " : ""}
            <span className={isCtx ? "ctx-word" : ""}>{w}</span>
          </span>
        );
      })}
    </div>
  );
}
