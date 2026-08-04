import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  /** Rendered inside the input, before the text. Used for the "@" on handles. */
  prefix?: string;
};

export function Field({
  label,
  hint,
  prefix,
  className,
  ...props
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-[13px] font-medium tracking-wide text-mute"
      >
        {label}
      </label>

      <div
        className={cn(
          "flex items-center rounded-xl border border-line bg-ink-soft",
          "transition-colors duration-150",
          "focus-within:border-mute focus-within:bg-[#101010]"
        )}
      >
        {prefix ? (
          <span className="pl-4 text-[15px] text-mute-dim select-none">
            {prefix}
          </span>
        ) : null}
        <input
          {...props}
          id={id}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            "h-12 w-full bg-transparent text-[15px] text-chalk",
            "placeholder:text-mute-dim focus:outline-none",
            prefix ? "pl-1 pr-4" : "px-4",
            className
          )}
        />
      </div>

      {hint ? (
        <p id={hintId} className="text-xs text-mute-dim">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
