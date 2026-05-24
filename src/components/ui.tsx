import { cx } from "@/lib/format";

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cx("panel", className)}>{children}</section>;
}

export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}

export function Notice({ message, tone = "info" }: { message?: string; tone?: "info" | "error" }) {
  if (!message) return null;
  return <p className={cx("notice", tone === "error" && "notice-error")}>{message}</p>;
}
