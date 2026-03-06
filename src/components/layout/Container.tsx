import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Container({ children, className, size = "md" }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8",
        size === "sm" && "max-w-3xl",
        size === "md" && "max-w-5xl",
        size === "lg" && "max-w-7xl",
        className
      )}
    >
      {children}
    </div>
  );
}
