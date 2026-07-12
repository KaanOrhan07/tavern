import Image from "next/image";
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary:
      "bg-gold text-ink font-semibold hover:bg-gold-light disabled:opacity-40",
    secondary:
      "border border-ink-line bg-ink-card text-cream hover:border-gold-dark disabled:opacity-40",
    danger:
      "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25 disabled:opacity-40",
    ghost: "text-cream-dim hover:text-cream disabled:opacity-40",
  } as const;
  return (
    <button
      className={cx(
        "rounded-lg px-4 py-2.5 min-h-11 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-lg border border-ink-line bg-ink-soft px-3.5 py-2.5 min-h-11 text-sm text-cream placeholder:text-cream-dim/60 outline-none focus:border-gold-dark",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "w-full rounded-lg border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-cream placeholder:text-cream-dim/60 outline-none focus:border-gold-dark",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "w-full rounded-lg border border-ink-line bg-ink-soft px-3.5 py-2.5 min-h-11 text-sm text-cream outline-none focus:border-gold-dark",
        className
      )}
      {...props}
    />
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-ink-line bg-ink-card p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-cream-dim">
      {children}
    </label>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "gold";
}) {
  const styles = {
    neutral: "bg-ink-soft text-cream-dim border-ink-line",
    ok: "bg-ok/10 text-ok border-ok/30",
    warn: "bg-warn/10 text-warn border-warn/30",
    danger: "bg-danger/10 text-danger border-danger/30",
    gold: "bg-gold/10 text-gold border-gold/30",
  } as const;
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-7 w-12 rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        checked ? "bg-gold" : "bg-ink-line"
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 h-6 w-6 rounded-full bg-cream transition-transform",
          checked ? "translate-x-5.5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink-line py-12 text-center">
      <p className="text-sm font-medium text-cream-dim">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-cream-dim/70">{description}</p>
      )}
    </div>
  );
}

export function TavernLogo({
  size = "md",
  showTagline = false,
}: {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}) {
  const sizes = {
    sm: { width: 120, height: 80 },
    md: { width: 180, height: 120 },
    lg: { width: 260, height: 175 },
  } as const;
  const dim = sizes[size];

  return (
    <div className="select-none text-center">
      <Image
        src="/tavern-logo.png"
        alt="Tavern"
        width={dim.width}
        height={dim.height}
        priority={size === "lg"}
        className="mx-auto h-auto w-auto"
        style={{ maxWidth: dim.width, height: "auto" }}
      />
      {showTagline && (
        <p className="mt-2 text-[10px] tracking-[0.3em] text-cream-dim uppercase">
          Manage. Grow. Thrive.
        </p>
      )}
    </div>
  );
}
