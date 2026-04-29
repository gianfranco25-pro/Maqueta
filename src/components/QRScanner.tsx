import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, Keyboard, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ELEMENT_ID = "kabutt-qr-reader";

// Códigos válidos: A00001-D, A00001-I (zapatos) o B00001 (accesorios)
export function isValidUnitCode(code: string) {
  return /^A\d{5}-(D|I)$/.test(code) || /^B\d{5}$/.test(code);
}

export function isPairCode(code: string) {
  return /^A\d{5}$/.test(code);
}

export function isSaleCode(code: string) {
  return /^V-\d{4}$/.test(code);
}

export function QRScanner({
  onResult,
  onClose,
  expectedHint,
  allowPairCodes = false,
  allowSaleCodes = false,
}: {
  onResult: (code: string) => void;
  onClose?: () => void;
  expectedHint?: string;
  allowPairCodes?: boolean;
  allowSaleCodes?: boolean;
}) {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manual, setManual] = useState("");
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (mode !== "camera") return;
    let mounted = true;

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(ELEMENT_ID, false);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (!mounted) return;
            handleResult(decodedText.trim().toUpperCase());
          },
          () => {}
        );
        setActive(true);
        setError(null);
      } catch (e: any) {
        setError("No se pudo abrir la cámara. Usa entrada manual.");
        setMode("manual");
      }
    };

    start();
    return () => {
      mounted = false;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        // Solo detener si está corriendo (state === 2)
        const state = (s as any).getState?.();
        if (state === 2) {
          s.stop().then(() => s.clear()).catch(() => {});
        } else {
          try { s.clear(); } catch {}
        }
      }
      setActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleResult = (code: string) => {
    if (!isValidUnitCode(code) && !(allowPairCodes && isPairCode(code)) && !(allowSaleCodes && isSaleCode(code))) {
      toast.error(`Código inválido: ${code}`, {
        description: allowSaleCodes ? "Formato esperado: V-0001, A00001, A00001-D, A00001-I o B00001" : allowPairCodes ? "Formato esperado: A00001, A00001-D, A00001-I o B00001" : "Formato esperado: A00001-D, A00001-I o B00001",
      });
      return;
    }
    onResult(code);
  };

  return (
    <div className="space-y-4">
      {expectedHint && (
        <div className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">{expectedHint}</div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "camera" ? "default" : "outline"}
          onClick={() => setMode("camera")}
          className="flex-1"
        >
          <Camera className="size-4 mr-2" /> Cámara
        </Button>
        <Button
          type="button"
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
          className="flex-1"
        >
          <Keyboard className="size-4 mr-2" /> Manual
        </Button>
        {onClose && (
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        )}
      </div>

      {mode === "camera" ? (
        <div className="relative rounded-2xl overflow-hidden bg-foreground aspect-square max-w-sm mx-auto">
          <div id={ELEMENT_ID} className="w-full h-full" />
          {!active && !error && (
            <div className="absolute inset-0 grid place-items-center text-background/70 text-sm">
              Iniciando cámara...
            </div>
          )}
          {/* overlay */}
          {active && (
            <>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="size-56 rounded-2xl border-2 border-accent/80 relative overflow-hidden">
                  <div className="scan-line absolute inset-x-0 h-1" />
                </div>
              </div>
              <div className="absolute bottom-3 inset-x-3 bg-foreground/70 backdrop-blur text-background text-[11px] rounded-lg px-3 py-2 text-center">
                Apunta al QR del par o pieza
              </div>
            </>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center p-4 text-background text-center">
              <div>
                <AlertCircle className="size-8 text-critical mx-auto mb-2" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleResult(manual.trim().toUpperCase());
            setManual("");
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())}
            placeholder={allowSaleCodes ? "Ej: V-0001, A00001-D o B00001" : allowPairCodes ? "Ej: A00001, A00001-D o B00001" : "Ej: A00001-D, A00001-I o B00001"}
            className="text-center text-lg tracking-wider font-mono h-14"
          />
          <Button type="submit" className="w-full h-12 bg-foreground text-background hover:bg-foreground/90">
            <CheckCircle2 className="size-4 mr-2" /> Confirmar código
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Formatos válidos: {allowSaleCodes && <><span className="font-mono">V-0001</span>, </>}{allowPairCodes && <><span className="font-mono">A00001</span>, </>}<span className="font-mono">A00001-D</span>,{" "}
            <span className="font-mono">A00001-I</span>, <span className="font-mono">B00001</span>
          </p>
        </form>
      )}
    </div>
  );
}
