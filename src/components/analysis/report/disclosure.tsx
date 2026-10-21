import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native <details>/<summary> disclosure: keyboard and screen-reader accessible
 * with no JS, and the open state survives re-renders.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen,
  className,
  summaryClassName,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
}) {
  return (
    <details open={defaultOpen} className={cn("group", className)}>
      <summary
        className={cn(
          "flex cursor-pointer list-none items-start gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden",
          summaryClassName
        )}
      >
        <div className="min-w-0 flex-1">{summary}</div>
        <ChevronDown
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      {children}
    </details>
  );
}
