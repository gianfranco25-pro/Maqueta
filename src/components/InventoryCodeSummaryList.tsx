import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import type { CodeSummary, PairSelectionMode } from "@/lib/inventory-code-summary";
import { X } from "lucide-react";

type InventoryCodeSummaryListProps = {
  items: CodeSummary[];
  emptyText?: string;
  onRemove?: (rawCode: string) => void;
  pairModes?: Record<string, PairSelectionMode>;
  onChangePairMode?: (key: string, mode: PairSelectionMode) => void;
  className?: string;
};

export function InventoryCodeSummaryList({
  items,
  emptyText,
  onRemove,
  pairModes,
  onChangePairMode,
  className,
}: InventoryCodeSummaryListProps) {
  if (items.length === 0) {
    return emptyText ? <p className="text-sm text-muted-foreground">{emptyText}</p> : null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <div key={item.key} className="rounded-xl border border-border/60 bg-background/60 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{item.title}</p>
              <p className="mt-1 font-mono text-sm break-all">{item.mainCode}</p>
              {item.productLabel && <p className="mt-1 text-sm">{item.productLabel}</p>}
              {item.locationName && <p className="mt-1 text-xs text-muted-foreground">Ubicacion general: {item.locationName}</p>}
              {item.responsibleName && <p className="mt-1 text-xs text-muted-foreground">Lo tiene: {item.responsibleName}</p>}
            </div>
            {onRemove && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Quitar codigo"
                onClick={() => onRemove(item.rawCode)}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <div className={cn("mt-3 grid gap-2", item.pieces.length > 1 ? "sm:grid-cols-2" : "grid-cols-1")}>
            {item.pieces.map((piece) => (
              <div
                key={`${item.key}-${piece.unitCode}`}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left",
                  piece.selected && "border-foreground bg-secondary/50",
                  !piece.selected && "border-border/60 bg-background/80",
                  !piece.exists && "border-dashed text-muted-foreground",
                  piece.exists && !piece.available && "border-dashed"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{piece.label}</p>
                    <p className="mt-1 font-mono text-sm break-all">{piece.unitCode}</p>
                  </div>
                  {piece.exists ? (
                    <StatusBadge kind={piece.status || "muted"} className="shrink-0" />
                  ) : (
                    <StatusBadge kind="muted" className="shrink-0">No registrado</StatusBadge>
                  )}
                </div>
                {piece.locationName && <p className="mt-2 text-xs text-muted-foreground">Ubicacion: {piece.locationName}</p>}
                {piece.responsibleName && <p className="mt-1 text-xs text-muted-foreground">Responsable: {piece.responsibleName}</p>}
                {!piece.exists && <p className="mt-2 text-xs text-muted-foreground">Esta pieza no esta registrada.</p>}
              </div>
            ))}
          </div>

          {onChangePairMode && item.pieces.length > 1 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { mode: "both" as PairSelectionMode, label: "Ambos", disabled: item.pieces.some((piece) => !piece.available) },
                { mode: "D" as PairSelectionMode, label: "Solo derecha", disabled: !item.pieces.some((piece) => piece.label === "Derecha" && piece.available) },
                { mode: "I" as PairSelectionMode, label: "Solo izquierda", disabled: !item.pieces.some((piece) => piece.label === "Izquierda" && piece.available) },
              ].map((option) => (
                <Button
                  key={`${item.key}-${option.mode}`}
                  type="button"
                  size="sm"
                  variant={pairModes?.[item.key] === option.mode ? "default" : "outline"}
                  disabled={option.disabled}
                  className="h-10 text-xs"
                  onClick={() => onChangePairMode(item.key, option.mode)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
