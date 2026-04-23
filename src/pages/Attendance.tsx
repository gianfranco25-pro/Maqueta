import { useRef, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Camera, MapPin, RotateCw, Check, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtDateTime } from "@/lib/format";

export default function Attendance() {
  const user = useCurrentUser();
  const locations = useAppStore((s) => s.locations);
  const attendance = useAppStore((s) => s.attendance);
  const addAttendance = useAppStore((s) => s.addAttendance);

  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [locationId, setLocationId] = useState(user?.locationId || locations[0]?.id || "");

  const isAdmin = user?.role === "admin" || user?.role === "administrativo";
  const records = isAdmin ? attendance : attendance.filter((a) => a.userId === user?.id);

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!user) return;
    if (!photo) {
      toast.error("Toma una foto antes de marcar");
      return;
    }
    const loc = locations.find((l) => l.id === locationId);
    addAttendance({
      userId: user.id,
      userName: user.name,
      locationId,
      locationName: loc?.name || "—",
      photoDataUrl: photo,
    });
    toast.success("Asistencia registrada", { description: `${user.name} · ${loc?.name}` });
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <PageHeader title="Asistencia" subtitle="Marcación de entrada con foto" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm space-y-4">
          <h2 className="font-display font-bold">Marcar mi entrada</h2>

          <div className="rounded-xl bg-secondary p-3 text-sm flex items-center gap-2">
            <MapPin className="size-4 text-accent" />
            <span className="font-medium">{user?.name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{new Date().toLocaleString("es-PE", { hour: "2-digit", minute: "2-digit", weekday: "short", day: "2-digit", month: "short" })}</span>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Ubicación</label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Foto</label>
            <div className="mt-1 aspect-[4/3] rounded-2xl border-2 border-dashed border-border bg-secondary/50 grid place-items-center overflow-hidden relative">
              {photo ? (
                <img src={photo} alt="Foto asistencia" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="size-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Toma una foto con la cámara</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="mt-2 flex gap-2">
              <Button onClick={() => fileRef.current?.click()} variant="outline" className="flex-1">
                <Camera className="size-4 mr-2" />
                {photo ? "Tomar otra" : "Abrir cámara"}
              </Button>
              {photo && (
                <Button variant="ghost" onClick={() => setPhoto(null)}>
                  <RotateCw className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <Button onClick={submit} disabled={!photo} className="w-full h-12 bg-foreground text-background hover:bg-foreground/90">
            <Check className="size-5 mr-2" /> Marcar asistencia
          </Button>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="px-5 py-4 border-b border-border/60">
            <h2 className="font-display font-bold">{isAdmin ? "Historial general" : "Mis marcaciones"}</h2>
          </div>
          <ul className="divide-y divide-border/60 max-h-[480px] overflow-y-auto">
            {records.length === 0 && <li className="p-6 text-sm text-muted-foreground text-center">Sin marcaciones todavía</li>}
            {records.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                <img src={r.photoDataUrl} alt="" className="size-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.userName}</p>
                  <p className="text-xs text-muted-foreground">{r.locationName}</p>
                </div>
                <p className="text-xs text-muted-foreground">{fmtDateTime(r.timestamp)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
