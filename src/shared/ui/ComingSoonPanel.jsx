export function ComingSoonPanel({ title, body, actions = null }) {
  return (
    <section className="bb-panel bb-coming-soon">
      <h2 className="bb-page-title text-2xl m-0">{title}</h2>
      <p className="bb-muted m-0 max-w-xl leading-relaxed">{body}</p>
      {actions}
    </section>
  );
}
