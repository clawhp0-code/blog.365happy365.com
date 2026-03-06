import { Info, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalloutProps {
  type?: "info" | "warning" | "success" | "tip";
  title?: string;
  children: React.ReactNode;
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  tip: Lightbulb,
};

const styles = {
  info: "bg-blue-50 border-blue-300 text-blue-800",
  warning: "bg-sunny-50 border-sunny-400 text-sunny-800",
  success: "bg-green-50 border-green-300 text-green-800",
  tip: "bg-coral-50 border-coral-300 text-coral-800",
};

export function Callout({ type = "info", title, children }: CalloutProps) {
  const Icon = icons[type];
  return (
    <div className={cn("flex gap-3 border-l-4 rounded-r-lg p-4 my-4", styles[type])}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
