import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-2 border border-transparent shadow-[0_1px_2px_rgba(26,29,26,0.08)]",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2 hover:border-[#d8d5cc] shadow-[0_1px_2px_rgba(26,29,26,0.04)]",
  ghost: "bg-transparent text-ink-2 border border-transparent hover:bg-black/[0.05] hover:text-ink",
  danger: "bg-surface text-danger border border-danger-line hover:bg-danger-soft",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9 px-4 text-sm gap-2 rounded-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Shared control styling for text inputs, selects and textareas. */
export const inputClass =
  "w-full h-9 px-3 text-sm text-ink bg-surface border border-line rounded-lg placeholder:text-ink-3 transition-colors focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/12 disabled:opacity-50";

export const selectClass = `${inputClass} appearance-none pr-8 bg-no-repeat bg-[right_0.7rem_center] bg-[length:14px_14px]`;

export const textareaClass =
  "w-full px-3 py-2 text-sm text-ink bg-surface border border-line rounded-lg placeholder:text-ink-3 transition-colors focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/12 resize-none";

/** Small metadata chip — neutral by default. */
export function Chip({
  children,
  tone = "neutral",
  className = "",
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "blue" | "danger" | "ochre";
  className?: string;
  title?: string;
}) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2 border-line",
    accent: "bg-accent-soft text-accent-2 border-accent-line",
    blue: "bg-blue-soft text-blue-2 border-blue-line",
    danger: "bg-danger-soft text-danger-2 border-danger-line",
    ochre: "bg-ochre-soft text-ochre-2 border-ochre-line",
  } as const;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium border rounded-full leading-tight ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Switch used for boolean settings. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
        checked ? "bg-accent" : "bg-[#d4d2ca]"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : ""
        }`}
      />
    </button>
  );
}

/** Segmented control for small exclusive choices (e.g. units). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex p-0.5 bg-canvas-2 border border-line rounded-lg gap-0.5"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 h-8 text-[13px] font-medium rounded-[6px] transition-colors ${
            value === opt.id
              ? "bg-surface text-ink shadow-[0_1px_2px_rgba(26,29,26,0.06)]"
              : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
