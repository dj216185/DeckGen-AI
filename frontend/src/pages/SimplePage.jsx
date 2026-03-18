export default function SimplePage({ title, text }) {
  return (
    <section className="card" style={{ marginBottom: "24px" }}>
      <h1 className="section-title" style={{ marginBottom: "8px" }}>{title}</h1>
      <p className="section-subtitle" style={{ marginBottom: "0" }}>{text}</p>
    </section>
  );
}
