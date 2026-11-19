import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell center">
      <div className="big-emoji" aria-hidden="true">🧭</div>
      <h1>Wrong turn!</h1>
      <p className="lede">There’s nothing here. Head back to your clue.</p>
      <Link className="button" href="/play">
        Back to my hunt
      </Link>
    </main>
  );
}
