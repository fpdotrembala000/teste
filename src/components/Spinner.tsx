import { Loader2 } from "lucide-react";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-white/70">
      <Loader2 className="w-4 h-4 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
