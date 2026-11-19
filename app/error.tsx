"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="shell center">
      <div className="big-emoji" aria-hidden="true">🙈</div>
      <h1>Oops, something went sideways</h1>
      <p className="lede">Your team’s progress is safe. Give it another try.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
