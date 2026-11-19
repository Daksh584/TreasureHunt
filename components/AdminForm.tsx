import type { ReactNode } from "react";
import ConfirmButton from "@/components/ConfirmButton";

/** One-button POST to /admin/action. */
export default function AdminForm({
  action,
  back,
  label,
  confirm,
  className = "button",
  fields = {},
}: {
  action: string;
  back: string;
  label: ReactNode;
  confirm?: string;
  className?: string;
  fields?: Record<string, string>;
}) {
  return (
    <form action="/admin/action" method="post" className="inline-form">
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="back" value={back} />
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {confirm ? (
        <ConfirmButton className={className} message={confirm}>
          {label}
        </ConfirmButton>
      ) : (
        <button className={className} type="submit">
          {label}
        </button>
      )}
    </form>
  );
}
