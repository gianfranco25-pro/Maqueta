import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useCan } from "@/components/Can";
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
import { useAppStore, useCurrentUser } from "@/lib/store";
import { fmtDate, fmtDateTime, fmtMoney } from "@/lib/format";
import { getUserRoles } from "@/lib/types";
import { toast } from "sonner";

export default function Advances() {
  const canManage = useCan("advances.manage");
  const users = useAppStore((s) => s.users);
  const allAdvances = useAppStore((s) => s.advances);
  const settings = useAppStore((s) => s.settings);
  const addAdvance = useAppStore((s) => s.addAdvance);
  const currentUser = useCurrentUser();
  const collaborators = users.filter((user) => getUserRoles(user).includes("vendedor"));
  const advances = canManage ? allAdvances : allAdvances.filter((advance) => advance.userId === currentUser?.id);

  const [userId, setUserId] = useState(collaborators[0]?.id || "");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  const totalAdvances = advances.reduce((acc, advance) => acc + advance.amount, 0);

  const submit = () => {
    if (!canManage || !currentUser) return;
    const collaborator = collaborators.find((item) => item.id === userId);
    if (!collaborator) return toast.error("Selecciona un colaborador");
    if (amount <= 0) return toast.error("El adelanto debe ser mayor a 0");
    if (!reason.trim()) return toast.error("Indica un motivo");

    addAdvance({
      userId: collaborator.id,
      userName: collaborator.name,
      amount,
      reason,
      paymentDate: paymentDate || undefined,
      byUserId: currentUser.id,
      byUserName: currentUser.name,
    });
    toast.success("Adelanto registrado");
    setAmount(0);
    setReason("");
    setPaymentDate("");
  };

  return (
    <>
      <PageHeader title="Adelantos" subtitle={canManage ? "Historial y control para liquidaciones" : "Mis adelantos registrados"} />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold">Historial de adelantos</h2>
              <p className="text-xs text-muted-foreground">Total registrado: {fmtMoney(totalAdvances)}</p>
            </div>
          </div>
          {advances.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin adelantos registrados</p>
          ) : (
            <ul className="divide-y">
              {advances.map((advance) => (
                <li key={advance.id} className="px-4 py-3 flex justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{advance.userName}</p>
                    <p className="text-xs text-muted-foreground">{advance.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Registro: {fmtDateTime(advance.timestamp)}
                      {advance.paymentDate ? ` · Pago ${fmtDate(advance.paymentDate)}` : ""}
                    </p>
                  </div>
                  <p className="font-display font-bold shrink-0">{fmtMoney(advance.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-card border p-5">
            <h2 className="font-display font-bold">Politica de pago</h2>
            <p className="text-sm text-muted-foreground mt-1">{settings.paymentPolicy}</p>
          </div>

          {canManage && (
            <div className="rounded-2xl bg-card border p-5 space-y-3">
              <h2 className="font-display font-bold">Registrar adelanto</h2>
              <div>
                <Label>Colaborador</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {collaborators.map((collaborator) => (
                      <SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto</Label>
                <Input type="number" value={amount} onChange={(event) => setAmount(+event.target.value)} />
              </div>
              <div>
                <Label>Motivo</Label>
                <Input value={reason} onChange={(event) => setReason(event.target.value)} />
              </div>
              <div>
                <Label>Fecha o politica de pago</Label>
                <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
              </div>
              <Button onClick={submit} className="w-full bg-foreground text-background hover:bg-foreground/90">
                Guardar adelanto
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
