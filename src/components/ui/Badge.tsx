import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "category" | "tag" | "featured";
  className?: string;
}

export function Badge({ children, variant = "tag", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variant === "category" && "bg-sunny-100 text-sunny-800",
        variant === "tag" && "bg-cream-200 text-ink-600",
        variant === "featured" && "bg-coral-100 text-coral-700",
        className
      )}
    >
      {children}
    </span>
  );
}
