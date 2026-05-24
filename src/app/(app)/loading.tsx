export default function Loading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <div>
        <p className="eyebrow">VAR-sjekk</p>
        <h1 className="section-title mt-2">Henter kampbildet...</h1>
      </div>
      <div className="loading-card" />
      <div className="loading-card loading-card-small" />
    </div>
  );
}
