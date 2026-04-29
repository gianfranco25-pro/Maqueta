import { useRef, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useCan } from "@/components/Can";

const limaDate = (iso = new Date().toISOString()) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Lima" });

export default function Attendance() {
  const user = useCurrentUser();
  const users = useAppStore((s) => s.users);
  const locations = useAppStore((s) => s.locations);
  const attendance = useAppStore((s) => s.attendance);
  const addAttendance = useAppStore((s) => s.addAttendance);
  const isAdmin = useCan("users.manage");

  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("todos");

  const assignedLocation = locations.find((location) => location.id === user?.locationId);
  const markedToday = attendance.some((record) =>
    record.userId === user?.id && limaDate(record.timestamp) === limaDate()
  );

  const records = (isAdmin ? attendance : attendance.filter((record) => record.userId === user?.id)).filter((record) => {
    if (isAdmin && userFilter !== "todos" && record.userId !== userFilter) return false;
    if (isAdmin && locationFilter !== "todos" && record.locationId !== locationFilter) return false;
    if (isAdmin && dateFilter && limaDate(record.timestamp) !== dateFilter) return false;
    return true;
  });

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
    try {
      addAttendance({
        userId: user.id,
        userName: user.name,
        locationId: user.locationId,
        locationName: assignedLocation?.name || "Sin ubicacion",
        photoDataUrl: photo,
      });
      toast.success("Asistencia registrada", { description: `${user.name} - ${assignedLocation?.name}` });
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar asistencia");
    }
  };

  return (
    <>
      <PageHeader title="Asistencia" subtitle={isAdmin ? "Consulta de asistencia" : "Marcacion de entrada con foto"} />

      <div className={`grid grid-cols-1 ${isAdmin ? "" : "lg:grid-cols-2"} gap-6`}>
        {!isAdmin && (
          <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm space-y-4">
            <h2 className="font-display font-bold">Marcar mi entrada</h2>

            <div className="rounded-xl bg-secondary p-3 text-sm flex items-center gap-2">
              <MapPin className="size-4 text-accent" />
              <span className="font-medium">{user?.name}</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-muted-foreground">{new Date().toLocaleString("es-PE", { hour: "2-digit", minute: "2-digit", weekday: "short", day: "2-digit", month: "short" })}</span>
            </div>

            <div className="rounded-xl border border-border p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Ubicacion asignada</p>
              <p className="font-medium mt-1">{assignedLocation?.name || "Sin ubicacion"}</p>
            </div>

            {markedToday ? (
              <div className="rounded-xl border border-success/30 bg-success-soft p-3 text-sm text-success">
                Tu entrada de hoy ya fue registrada.
              </div>
            ) : (
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Foto</label>
                <div className="mt-1 aspect-[4/3] rounded-2xl border-2 border-dashed border-border bg-secondary/50 grid place-items-center overflow-hidden relative">
                  {photo ? (
                    <img src={photo} alt="Foto asistencia" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="size-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Toma una foto con la camara</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => fileRef.current?.click()} variant="outline" className="flex-1">
                    <Camera className="size-4 mr-2" />
                    {photo ? "Tomar otra" : "Abrir camara"}
                  </Button>
                  {photo && (
                    <Button variant="ghost" onClick={() => setPhoto(null)}>
                      <RotateCw className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            <Button onClick={submit} disabled={!photo || markedToday} className="w-full h-12 bg-foreground text-background hover:bg-foreground/90">
              <Check className="size-5 mr-2" /> {markedToday ? "Entrada ya marcada hoy" : "Marcar asistencia"}
            </Button>
          </div>
        )}

        <div className="rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="px-5 py-4 border-b border-border/60">
            <h2 className="font-display font-bold">{isAdmin ? "Historial general" : "Mi historial"}</h2>
            {isAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger><SelectValue placeholder="Usuario" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los usuarios</SelectItem>
                    {users.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger><SelectValue placeholder="Ubicacion" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <ul className="divide-y divide-border/60 max-h-[480px] overflow-y-auto">
            {records.length === 0 && <li className="p-6 text-sm text-muted-foreground text-center">Sin marcaciones todavia</li>}
            {records.map((record) => (
              <li key={record.id} className="px-4 py-3 flex items-center gap-3">
                <img src={record.photoDataUrl} alt="" className="size-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{record.userName}</p>
                  <p className="text-xs text-muted-foreground">{record.locationName}</p>
                </div>
                <p className="text-xs text-muted-foreground">{fmtDateTime(record.timestamp)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
