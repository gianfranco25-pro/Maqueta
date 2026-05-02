import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { AlertCircle, Camera, CheckCircle2, Keyboard, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ELEMENT_ID = "kabutt-qr-reader";

export function isValidUnitCode(code: string) {
  return /^(?:[A-Z]\d{5}|[A-Z]\d{5}-(D|I))$/.test(code);
}

export function isPairCode(code: string) {
  return /^[A-Z]\d{5}$/.test(code);
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
      } catch {
        setError("No se pudo abrir la camara. Usa entrada manual.");
        setMode("manual");
      }
    };

    start();

    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        const state = (scanner as { getState?: () => number }).getState?.();
        if (state === 2) {
          scanner.stop().then(() => scanner.clear()).catch(() => {});
        } else {
          try {
            scanner.clear();
          } catch {}
        }
      }
      setActive(false);
    };
  }, [mode]);

  const handleResult = (code: string) => {
    const valid =
      isValidUnitCode(code) ||
      (allowPairCodes && isPairCode(code)) ||
      (allowSaleCodes && isSaleCode(code));

    if (!valid) {
      toast.error(`Codigo invalido: ${code}`, {
        description: allowSaleCodes
          ? "Formato esperado: A00001, A00001-D o C00001-I"
          : allowPairCodes
            ? "Formato esperado: A00001, A00001-D o C00001-I"
            : "Formato esperado: A00001, A00001-D o C00001-I",
      });
      return;
    }

    onResult(code);
  };

  return (
    <div className="space-y-4">
      {expectedHint && (
        <div className="rounded-lg bg-secondary px-3 py-2 text-sm leading-relaxed text-muted-foreground">{expectedHint}</div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "camera" ? "default" : "outline"}
          onClick={() => setMode("camera")}
          className="flex-1"
        >
          <Camera className="mr-2 size-4" />
          Camara
        </Button>
        <Button
          type="button"
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
          className="flex-1"
        >
          <Keyboard className="mr-2 size-4" />
          Manual
        </Button>
        {onClose && (
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        )}
      </div>

      {mode === "camera" ? (
        <div className="relative mx-auto aspect-square max-w-sm overflow-hidden rounded-2xl bg-foreground">
          <div id={ELEMENT_ID} className="h-full w-full" />

          {!active && !error && (
            <div className="absolute inset-0 grid place-items-center text-sm text-background/70">
              Iniciando camara...
            </div>
          )}

          {active && (
            <>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="relative size-56 overflow-hidden rounded-2xl border-2 border-accent/80">
                  <div className="scan-line absolute inset-x-0 h-1" />
                </div>
              </div>
              <div className="absolute inset-x-3 bottom-3 rounded-lg bg-foreground/70 px-3 py-2 text-center text-[11px] text-background backdrop-blur">
                Apunta al QR del par o de la pieza
              </div>
            </>
          )}

          {error && (
            <div className="absolute inset-0 grid place-items-center p-4 text-center text-background">
              <div>
                <AlertCircle className="mx-auto mb-2 size-8 text-critical" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleResult(manual.trim().toUpperCase());
            setManual("");
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            value={manual}
            onChange={(event) => setManual(event.target.value.toUpperCase())}
            placeholder={
              allowSaleCodes
                ? "Ej: A00001-D o C00001-I"
                : allowPairCodes
                  ? "Ej: A00001, A00001-D o C00001-I"
                  : "Ej: A00001, A00001-D o C00001-I"
            }
            className="h-14 text-center font-mono text-lg tracking-wider"
          />
          <Button type="submit" className="h-12 w-full bg-foreground text-background hover:bg-foreground/90">
            <CheckCircle2 className="mr-2 size-4" />
            Confirmar codigo
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Formatos validos: {allowPairCodes && <><span className="font-mono">A00001</span>, </>}
            <span className="font-mono">A00001-D</span>, <span className="font-mono">A00001-I</span>,{" "}
            <span className="font-mono">C00001</span>
          </p>
        </form>
      )}
    </div>
  );
}
