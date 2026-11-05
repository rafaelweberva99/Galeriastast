import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card cmp-msg">
      <h1 className="section-title">Este hincha no tiene el carnet público</h1>
      <p className="muted">No lo encontramos o prefirió mantener su carnet privado. Pídele que lo haga público para compararse.</p>
      <Link className="btn" href="/rankings">
        Ver hinchas
      </Link>
    </div>
  );
}
