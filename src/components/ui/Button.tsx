import Link from "next/link";
import { cn } from "@/lib/utils";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  className,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200",
    variant === "primary" && "bg-sunny-500 text-white hover:bg-sunny-600 shadow-sm hover:shadow",
    variant === "secondary" && "bg-coral-500 text-white hover:bg-coral-600 shadow-sm hover:shadow",
    variant === "outline" && "border-2 border-sunny-400 text-sunny-700 hover:bg-sunny-50",
    size === "sm" && "text-sm px-4 py-1.5",
    size === "md" && "text-sm px-6 py-2.5",
    size === "lg" && "text-base px-8 py-3",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
