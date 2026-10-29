import Image from "next/image";
import Link from "next/link";
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  const sizes = {
    sm: "px-3 py-1.5 min-h-9 text-xs",
    md: "px-4 py-2.5 min-h-11 text-sm",
    lg: "px-6 py-3.5 min-h-12 text-base",
  } as const;
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
        "pressable inline-flex items-center justify-center gap-2 rounded-lg cursor-pointer disabled:cursor-not-allowed",
        sizes[size],
        styles[variant],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" aria-hidden fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-lg border border-ink-line bg-ink-soft px-3.5 py-2.5 min-h-11 text-sm text-cream placeholder:text-cream-dim/60 outline-none transition-colors focus:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
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
        "w-full rounded-lg border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-cream placeholder:text-cream-dim/60 outline-none transition-colors focus:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
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
        "w-full rounded-lg border border-ink-line bg-ink-soft px-3.5 py-2.5 min-h-11 text-sm text-cream outline-none transition-colors focus:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
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
        "rounded-xl border border-ink-line bg-ink-card p-5 shadow-[var(--shadow-1)]",
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
    <div className="select-none rounded-xl border border-dashed border-ink-line py-12 text-center">
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

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-cream-dim">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Segmentli seçici (sekme/dönem). Klavye: ok tuşları ile gezilir. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex gap-1 rounded-xl bg-ink-soft p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "pressable min-h-9 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-medium",
              on ? "bg-gold text-ink shadow-[var(--shadow-1)]" : "text-cream-dim hover:text-cream"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  href,
  tone = "default",
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  href?: string;
  tone?: "default" | "warn" | "ok";
  children?: ReactNode;
}) {
  const inner = (
    <div
      className={cx(
        "pressable h-full rounded-xl border bg-ink-card p-4 shadow-[var(--shadow-1)]",
        tone === "warn" ? "border-warn/50" : tone === "ok" ? "border-ok/40" : "border-ink-line",
        href && "hover:border-gold"
      )}
    >
      <div className="flex items-center justify-between gap-2 text-cream-dim">
        <p className="text-xs font-medium">{label}</p>
        {icon && <span aria-hidden className="text-gold">{icon}</span>}
      </div>
      <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <div className="mt-0.5 text-xs text-cream-dim">{hint}</div>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}
