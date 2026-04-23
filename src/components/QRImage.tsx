import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QRImage({ value, size = 128 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#111111", light: "#ffffff" },
    }).catch(() => {});
  }, [value, size]);
  return <canvas ref={ref} aria-label={`QR ${value}`} />;
}
