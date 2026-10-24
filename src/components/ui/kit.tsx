// অভিযোগ — কাস্টম UI কিট (HeroUI বিহীন, সম্পূর্ণ pure-JS স্ট্যাক)
// Android নেটিভ অনুভূতি: প্রেস-ফিডব্যাক, সফট চিপ, নেটিভ ড্রপডাউন।

"use client";

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── বোতাম ──────────────────────────────────────────────────
type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "tertiary";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  isDisabled?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", onPress, isDisabled, className, children, disabled, onClick, ...rest },
  ref
) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-accent text-accent-foreground shadow-sm shadow-accent/25 active:bg-accent/90",
    outline:
      "border border-border bg-surface text-foreground active:bg-surface-secondary",
    ghost: "bg-transparent text-accent active:bg-accent/10",
    danger: "bg-danger text-danger-foreground active:bg-danger/90",
    tertiary: "bg-surface-secondary text-foreground active:bg-border/60",
  };
  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-xs rounded-xl",
    md: "h-11 px-4 text-sm rounded-xl",
  };
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled ?? isDisabled}
      onClick={(e) => {
        onClick?.(e);
        onPress?.();
      }}
      className={cn(
        "inline-flex select-none items-center justify-center gap-1.5 font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

// ─── চিপ ────────────────────────────────────────────────────
type ChipColor = "accent" | "success" | "warning" | "danger" | "default";
type ChipVariant = "soft" | "tertiary" | "solid";

export function Chip({
  color = "accent",
  variant = "soft",
  size = "sm",
  className,
  children,
}: {
  color?: ChipColor;
  variant?: ChipVariant;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  const soft: Record<ChipColor, string> = {
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    default: "bg-surface-secondary text-muted",
  };
  const solid: Record<ChipColor, string> = {
    accent: "bg-accent text-accent-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    danger: "bg-danger text-danger-foreground",
    default: "bg-muted text-background",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-semibold",
        size === "sm" ? "h-6 px-2.5 text-[11px]" : "h-7 px-3 text-xs",
        variant === "soft" && soft[color],
        variant === "solid" && solid[color],
        variant === "tertiary" && "bg-surface-secondary text-muted",
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── কার্ড ──────────────────────────────────────────────────
export function Card({
  variant = "default",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" }) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variant === "secondary"
          ? "border border-border bg-surface-secondary"
          : "border border-border bg-surface",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── প্রগ্রেস বার ────────────────────────────────────────────
export function ProgressBar({
  value,
  size = "sm",
  className,
  fillClassName,
  "aria-label": ariaLabel,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
  fillClassName?: string;
  "aria-label"?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn(
        "w-full overflow-hidden rounded-full bg-surface-secondary",
        size === "sm" ? "h-1.5" : "h-2.5",
        className
      )}
    >
      <div
        className={cn("h-full rounded-full bg-accent transition-all duration-500", fillClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── স্কেলেটন ───────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-secondary", className)} />;
}

// ─── স্পিনার ────────────────────────────────────────────────
export function Spinner({
  size = "md",
  className,
  "aria-label": ariaLabel,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  "aria-label"?: string;
}) {
  const sizes = { sm: "size-4 border-2", md: "size-6 border-2", lg: "size-8 border-[3px]" };
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn(
        "inline-block animate-spin rounded-full border-accent/25 border-t-accent",
        sizes[size],
        className
      )}
    />
  );
}

// ─── নেটিভ <select> ফিল্ড — Android-এ সিস্টেম পিকার খোলে ──────
export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
}: {
  label?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-xs font-semibold text-foreground">{label}</span>}
      <span className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-11 w-full appearance-none rounded-xl border border-border bg-surface px-3 pe-8 text-[13px] outline-none transition-colors focus:border-accent disabled:opacity-50",
            value ? "text-foreground" : "text-muted"
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </span>
    </label>
  );
}

// ─── টেক্সট ফিল্ড (নেটিভ input/textarea + লেবেল + হিন্ট) ──────
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-xs font-semibold text-foreground">{label}</span>}
      {children}
      {hint && <span className="text-[11px] leading-relaxed text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-[13px] outline-none transition-colors placeholder:text-muted/70 focus:border-accent";

export const textareaCls =
  "w-full rounded-xl border border-border bg-surface p-3 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-muted/70 focus:border-accent";
