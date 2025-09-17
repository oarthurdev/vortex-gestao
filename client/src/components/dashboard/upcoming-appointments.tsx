import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import type { Appointment, Client, Property } from "@shared/schema";

const UPCOMING_APPOINTMENTS_QUERY = "/api/appointments?upcoming=true&limit=5";

const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  visita: "Visita",
  reuniao: "Reunião",
  vistoria: "Vistoria",
};

const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
  no_show: "Não compareceu",
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function UpcomingAppointments() {
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: [UPCOMING_APPOINTMENTS_QUERY],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const clientMap = useMemo(() => new Map((clients ?? []).map((client) => [client.id, client])), [clients]);
  const propertyMap = useMemo(
    () => new Map((properties ?? []).map((property) => [property.id, property])),
    [properties],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5 text-primary" /> Agenda estratégica
        </CardTitle>
        <CardDescription>Visitas e reuniões confirmadas para os próximos dias.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando compromissos...</p>
        ) : appointments && appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const client = clientMap.get(appointment.clientId);
              const property = appointment.propertyId ? propertyMap.get(appointment.propertyId) : undefined;

              return (
                <div key={appointment.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{client?.name ?? "Cliente"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" /> {formatDateTime(appointment.scheduledAt)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {APPOINTMENT_TYPE_LABEL[appointment.type] ?? appointment.type}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {APPOINTMENT_STATUS_LABEL[appointment.status] ?? appointment.status}
                    </Badge>
                    {appointment.durationMinutes ? <span>{appointment.durationMinutes} min</span> : null}
                    {appointment.agentName ? <span>Responsável: {appointment.agentName}</span> : null}
                  </div>

                  {property ? (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {property.title}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum compromisso agendado.</p>
        )}
      </CardContent>
    </Card>
  );
}
