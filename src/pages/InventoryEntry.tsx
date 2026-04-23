import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { QRImage } from "@/components/QRImage";

export default function InventoryEntry() {
  const products = useAppStore((s) => s.products);
  const locations = useAppStore((s) => s.locations);
  const addPair = useAppStore((s) => s.addShoePair);
  const addAccs = useAppStore((s) => s.addAccessoryUnits);
  const navigate = useNavigate();

  const [productId, setProductId] = useState(products[0]?.id || "");
  const [locationId, setLocationId] = useState(locations.find((l) => l.type === "almacen")?.id || locations[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const product = products.find((p) => p.id === productId);

  const submit = () => {
    if (!product) return;
    if (qty < 1) return toast.error("Cantidad mínima 1");
    const codes: string[] = [];
    if (product.type === "zapato") {
      for (let i = 0; i < qty; i++) {
        const { pairCode } = addPair(product.id, locationId);
        codes.push(pairCode);
      }
      toast.success(`${qty} pares ingresados`, { description: codes.join(", ") });
    } else {
      const c = addAccs(product.id, locationId, qty);
      codes.push(...c);
      toast.success(`${qty} unidades ingresadas`);
    }
    setGeneratedCodes(codes);
  };

  return (
    <>
      <PageHeader title="Ingreso de inventario" subtitle="Genera códigos QR automáticamente" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border border-border/60 p-5 space-y-4">
          <div>
            <Label>Producto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.brand} · {p.model} {p.size ? `· T${p.size}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            {product && (
              <p className="text-xs text-muted-foreground mt-1">
                Tipo: <strong className="text-foreground">{product.type}</strong>
                {product.type === "zapato" ? " (se generan códigos D e I por par)" : " (unidades sueltas)"}
              </p>
            )}
          </div>

          <div>
            <Label>Ubicación destino</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Cantidad ({product?.type === "zapato" ? "pares" : "unidades"})</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button onClick={submit} className="flex-1 bg-foreground text-background hover:bg-foreground/90">Registrar ingreso</Button>
            <Button variant="outline" onClick={() => navigate("/inventario")}>Volver</Button>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-5">
          <h2 className="font-display font-bold mb-3">Códigos generados</h2>
          {generatedCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aquí aparecerán los QR generados al registrar un ingreso.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[480px] overflow-y-auto">
              {generatedCodes.map((c) => (
                <div key={c} className="rounded-xl border border-border p-3 text-center">
                  <p className="font-mono text-xs font-bold mb-2">{c}</p>
                  {c.startsWith("A") ? (
                    <div className="flex gap-2 justify-center">
                      <div>
                        <QRImage value={`${c}-D`} size={70} />
                        <p className="text-[9px] mt-1">{c}-D</p>
                      </div>
                      <div>
                        <QRImage value={`${c}-I`} size={70} />
                        <p className="text-[9px] mt-1">{c}-I</p>
                      </div>
                    </div>
                  ) : (
                    <QRImage value={c} size={100} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
