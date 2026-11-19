import { configTodos } from "@/hunt.config";

/** Lists every {{placeholder}} still left in hunt.config.ts. Renders nothing once all are filled. */
export default function ConfigTodos({ open = false }: { open?: boolean }) {
  const todos = configTodos();
  if (todos.length === 0) return null;
  return (
    <details className="todo-box admin-chrome" open={open}>
      <summary>
        ✏️ {todos.length} placeholder{todos.length === 1 ? "" : "s"} still to fill in <code>hunt.config.ts</code> before the event
      </summary>
      <ul>
        {todos.map((t, i) => (
          <li key={i}>
            <strong>{t.where}:</strong> {t.text}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Highlights {{placeholders}} inside a text. */
export function Marked({ text }: { text: string }) {
  const parts = text.split(/(\{\{[^}]*\}\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("{{") ? (
          <mark key={i} className="todo-mark">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  );
}
