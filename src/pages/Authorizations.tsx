import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { useCan } from "@/components/Can";

export default function Authorizations() {
  const auths = useAppStore((s) => s.authorizations);
  const resolve = useAppStore((s) => s.resolveAuthorization);
  const user = useCurrentUser();
  const canReview = useCan("auth.review");

  return (
    <>
      <PageHeader title="Autorizaciones" subtitle="Solicitudes de autorizacion" />
      <div className="rounded-2xl bg-card border overflow-hidden">
        {auths.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground text-sm">No hay solicitudes</p>
        ) : (
          <ul className="divide-y">
            {auths.map((a) => (
              <li key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{a.type.replace("_", " ")}</p>
                  <p className="font-medium">{a.detail}</p>
                  <p className="text-xs text-muted-foreground">{a.requestedByName} · {fmtDateTime(a.timestamp)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.amount !== undefined && <span className="font-display font-bold">{fmtMoney(a.amount)}</span>}
                  <StatusBadge kind={a.status} />
                  {a.status === "pendiente" && canReview && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { resolve(a.id, false, user!.id); toast.error("Rechazada"); }}>Rechazar</Button>
                      <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90" onClick={() => { resolve(a.id, true, user!.id); toast.success("Aprobada"); }}>Aprobar</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
