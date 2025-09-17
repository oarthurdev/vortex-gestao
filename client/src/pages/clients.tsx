import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  Clock3,
  Edit,
  Handshake,
  Mail,
  MapPin,
  MessageSquare,
  NotebookPen,
  Plus,
  Tag,
  Trash2,
  TrendingUp,
  User,
  Users,
  Phone as PhoneIcon,
} from "lucide-react";
import type {
  Appointment,
  Client,
  ClientInteraction,
  ClientPipelineSummary,
  InsertAppointment,
  InsertClient,
  Property,
} from "@shared/schema";

const CLIENT_STAGE_OPTIONS = [
  { value: "novo", label: "Novo lead" },
  { value: "qualificado", label: "Qualificado" },
  { value: "visita_agendada", label: "Visita agendada" },
  { value: "proposta", label: "Proposta enviada" },
  { value: "fechado", label: "Negócio fechado" },
  { value: "perdido", label: "Perdido" },
] as const;

const CLIENT_TYPE_LABEL: Record<string, string> = {
  lead: "Lead",
  proprietario: "Proprietário",
  locatario: "Locatário",
  comprador: "Comprador",
};

const STAGE_COLORS: Record<string, string> = {
  novo: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  qualificado: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100",
  visita_agendada: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
  proposta: "bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200",
  fechado: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
  perdido: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
};

const INTERACTION_TYPES = [
  { value: "contato_telefonico", label: "Contato telefônico" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "visita", label: "Visita presencial" },
  { value: "proposta", label: "Envio de proposta" },
  { value: "assinatura", label: "Assinatura de contrato" },
];

const INTERACTION_CHANNELS = [
  { value: "telefone", label: "Telefone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "presencial", label: "Presencial" },
];

const APPOINTMENT_TYPES = [
  { value: "visita", label: "Visita" },
  { value: "reuniao", label: "Reunião" },
  { value: "vistoria", label: "Vistoria" },
];

const APPOINTMENT_STATUS = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "realizado", label: "Realizado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "no_show", label: "Não compareceu" },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const UPCOMING_APPOINTMENTS_QUERY = "/api/appointments?upcoming=true&limit=5";

type ClientFormState = Omit<Partial<InsertClient>, "nextFollowUp" | "pipelineValue" | "tags"> & {
  nextFollowUp?: string | null;
  pipelineValue?: string | number | null;
  tags?: string[];
};

type InteractionFormState = {
  type: string;
  channel: string;
  summary: string;
  occurredAt: string;
  nextSteps: string;
  nextFollowUp?: string;
  stage?: string;
  createdBy: string;
};

type AppointmentFormState = {
  type: string;
  status: string;
  scheduledAt: string;
  propertyId?: string;
  durationMinutes: number;
  notes: string;
  channel: string;
  agentName: string;
};

const toInputDateTimeValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
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

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

const getStageLabel = (stage: string) =>
  CLIENT_STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage;

const getStageBadgeClass = (stage: string) => STAGE_COLORS[stage] ?? "bg-muted";

const getClientTypeLabel = (type: string) => CLIENT_TYPE_LABEL[type] ?? type;

export default function Clients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormState>({
    name: "",
    email: "",
    phone: "",
    document: "",
    type: "lead",
    stage: "novo",
    source: "",
    address: "",
    notes: "",
    pipelineValue: "",
    nextFollowUp: "",
    tags: [],
  });
  const [tagsInput, setTagsInput] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  const [interactionForm, setInteractionForm] = useState<InteractionFormState>({
    type: "contato_telefonico",
    channel: "telefone",
    summary: "",
    occurredAt: toInputDateTimeValue(new Date()),
    nextSteps: "",
    nextFollowUp: "",
    stage: undefined,
    createdBy: user?.name ?? "",
  });
  const [selectedClientForAppointment, setSelectedClientForAppointment] = useState<Client | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormState>({
    type: "visita",
    status: "agendado",
    scheduledAt: toInputDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)),
    propertyId: "",
    durationMinutes: 60,
    notes: "",
    channel: "presencial",
    agentName: user?.name ?? "",
  });

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: pipelineSummary } = useQuery<ClientPipelineSummary>({
    queryKey: ["/api/clients/pipeline"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: upcomingAppointments } = useQuery<Appointment[]>({
    queryKey: [UPCOMING_APPOINTMENTS_QUERY],
  });

  const { data: interactions, isLoading: isLoadingInteractions } = useQuery<ClientInteraction[]>({
    queryKey: selectedClient ? [`/api/clients/${selectedClient.id}/interactions`] : ["interactions"] ,
    enabled: isInteractionDialogOpen && !!selectedClient,
  });

  const clientMap = useMemo(() => {
    return new Map((clients ?? []).map((client) => [client.id, client]));
  }, [clients]);

  const propertyMap = useMemo(() => {
    return new Map((properties ?? []).map((property) => [property.id, property]));
  }, [properties]);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      document: "",
      type: "lead",
      stage: "novo",
      source: "",
      address: "",
      notes: "",
      pipelineValue: "",
      nextFollowUp: "",
      tags: [],
    });
    setTagsInput("");
  };

  const resetInteractionForm = (client?: Client) => {
    setInteractionForm({
      type: "contato_telefonico",
      channel: "telefone",
      summary: "",
      occurredAt: toInputDateTimeValue(new Date()),
      nextSteps: "",
      nextFollowUp: client?.nextFollowUp
        ? toInputDateTimeValue(new Date(client.nextFollowUp))
        : "",
      stage: client?.stage,
      createdBy: user?.name ?? "",
    });
  };

  const resetAppointmentForm = () => {
    setAppointmentForm({
      type: "visita",
      status: "agendado",
      scheduledAt: toInputDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)),
      propertyId: "",
      durationMinutes: 60,
      notes: "",
      channel: "presencial",
      agentName: user?.name ?? "",
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Cliente criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar cliente",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertClient> }) => {
      const res = await apiRequest("PUT", `/api/clients/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/pipeline"] });
      setEditingClient(null);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Cliente atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar cliente",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/pipeline"] });
      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir cliente",
        variant: "destructive",
      });
    },
  });

  const interactionMutation = useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/interactions`, data);
      return await res.json();
    },
    onSuccess: () => {
      if (selectedClient) {
        queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClient.id}/interactions`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/pipeline"] });
      resetInteractionForm(selectedClient ?? undefined);
      toast({
        title: "Registro salvo",
        description: "Interação registrada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a interação",
        variant: "destructive",
      });
    },
  });

  type AppointmentPayload = Omit<InsertAppointment, "companyId">;

  const appointmentMutation = useMutation({
    mutationFn: async (data: AppointmentPayload) => {
      const res = await apiRequest("POST", "/api/appointments", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [UPCOMING_APPOINTMENTS_QUERY] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/pipeline"] });
      setIsAppointmentDialogOpen(false);
      resetAppointmentForm();
      toast({
        title: "Compromisso agendado",
        description: "Compromisso criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o compromisso",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload: InsertClient = {
      ...(formData as InsertClient),
      tags,
      stage: formData.stage ?? "novo",
    };

    if (!payload.pipelineValue || payload.pipelineValue === "") {
      delete (payload as Record<string, unknown>).pipelineValue;
    }

    if (formData.nextFollowUp && formData.nextFollowUp !== "") {
      payload.nextFollowUp = new Date(formData.nextFollowUp);
    } else {
      delete (payload as Record<string, unknown>).nextFollowUp;
    }

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      ...client,
      lastContactAt: client.lastContactAt ?? undefined,
      pipelineValue: client.pipelineValue ?? "",
      nextFollowUp: client.nextFollowUp
        ? toInputDateTimeValue(new Date(client.nextFollowUp))
        : "",
      tags: client.tags ?? [],
    });
    setTagsInput((client.tags ?? []).join(", "));
    setIsCreateDialogOpen(true);
  };

  const handleInteractionSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClient) return;

    const payload: Record<string, unknown> = {
      ...interactionForm,
      nextFollowUp: interactionForm.nextFollowUp ? interactionForm.nextFollowUp : undefined,
      stage: interactionForm.stage ? interactionForm.stage : undefined,
      channel: interactionForm.channel ? interactionForm.channel : undefined,
      nextSteps: interactionForm.nextSteps ? interactionForm.nextSteps : undefined,
      createdBy: interactionForm.createdBy ? interactionForm.createdBy : undefined,
    };

    interactionMutation.mutate({ clientId: selectedClient.id, data: payload });
  };

  const handleAppointmentSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClientForAppointment) return;

    const payload: AppointmentPayload = {
      clientId: selectedClientForAppointment.id,
      type: appointmentForm.type,
      status: appointmentForm.status,
      scheduledAt: new Date(appointmentForm.scheduledAt),
      durationMinutes: appointmentForm.durationMinutes,
      notes: appointmentForm.notes ? appointmentForm.notes : undefined,
      channel: appointmentForm.channel ? appointmentForm.channel : undefined,
      agentName: appointmentForm.agentName ? appointmentForm.agentName : undefined,
      propertyId: appointmentForm.propertyId ? appointmentForm.propertyId : undefined,
    };

    appointmentMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Clientes" subtitle="Gerencie seus clientes" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
              <p className="mt-4 text-muted-foreground">Carregando clientes...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Clientes" subtitle="Gerencie seus clientes" />

        <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="clients-content">
          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-5 w-5 text-primary" /> Pipeline comercial
                </CardTitle>
                <CardDescription>
                  Acompanhe o funil de relacionamento e a previsão de receita com base nas oportunidades abertas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(pipelineSummary?.stages ?? []).map((stage) => (
                    <div key={stage.stage} className="rounded-lg border bg-muted/50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          {CLIENT_STAGE_OPTIONS.find((option) => option.value === stage.stage)?.label ?? stage.stage}
                        </span>
                        <Badge variant="secondary" className={getStageBadgeClass(stage.stage)}>
                          {stage.count}
                        </Badge>
                      </div>
                      <div className="mt-2 text-2xl font-semibold">
                        {CURRENCY_FORMATTER.format(stage.totalValue)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Valor potencial distribuído neste estágio
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de conversão do funil</span>
                    <span className="font-semibold">
                      {pipelineSummary ? pipelineSummary.conversionRate.toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <Progress value={pipelineSummary?.conversionRate ?? 0} />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <NotebookPen className="h-4 w-4 text-primary" /> Próximos follow-ups
                  </CardTitle>
                  <CardDescription>Fique atento aos retornos combinados com seus clientes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(pipelineSummary?.upcomingFollowUps ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum follow-up agendado para os próximos dias.</p>
                  ) : (
                    <div className="space-y-3">
                      {pipelineSummary?.upcomingFollowUps.map((followUp) => (
                        <div key={`${followUp.clientId}-${followUp.nextFollowUp.toString()}`} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{followUp.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDateTime(followUp.nextFollowUp)}
                              </p>
                            </div>
                            <Badge variant="secondary" className={getStageBadgeClass(followUp.stage)}>
                              {getStageLabel(followUp.stage)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-4 w-4 text-primary" /> Próximos compromissos
                  </CardTitle>
                  <CardDescription>Agenda integrada com visitas e reuniões confirmadas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(upcomingAppointments ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma visita agendada para os próximos dias.</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingAppointments?.map((appointment) => {
                        const client = clientMap.get(appointment.clientId);
                        const property = appointment.propertyId ? propertyMap.get(appointment.propertyId) : undefined;

                        return (
                          <div key={appointment.id} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{client?.name ?? "Cliente"}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock3 className="h-3.5 w-3.5" /> {formatDateTime(appointment.scheduledAt)}
                                </p>
                              </div>
                              <Badge variant="outline">{APPOINTMENT_TYPES.find((item) => item.value === appointment.type)?.label ?? appointment.type}</Badge>
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
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Lista de Clientes</h2>
              <p className="text-muted-foreground">
                {clients?.length || 0} clientes cadastrados
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingClient(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-client">
                  <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl" data-testid="dialog-client-form">
                <DialogHeader>
                  <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={formData.name ?? ""}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                        placeholder="Nome do cliente"
                        data-testid="input-client-name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="type">Tipo *</Label>
                      <Select
                        value={formData.type ?? "lead"}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                        data-testid="select-client-type"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="proprietario">Proprietário</SelectItem>
                          <SelectItem value="locatario">Locatário</SelectItem>
                          <SelectItem value="comprador">Comprador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="stage">Estágio no funil *</Label>
                      <Select
                        value={formData.stage ?? "novo"}
                        onValueChange={(value) => setFormData({ ...formData, stage: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLIENT_STAGE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="pipelineValue">Valor estimado da oportunidade</Label>
                      <Input
                        id="pipelineValue"
                        value={formData.pipelineValue ?? ""}
                        onChange={(event) => setFormData({ ...formData, pipelineValue: event.target.value })}
                        placeholder="Ex: 450000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email ?? ""}
                        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                        placeholder="cliente@email.com"
                        data-testid="input-client-email"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone ?? ""}
                        onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                        placeholder="(11) 99999-9999"
                        data-testid="input-client-phone"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="document">CPF/CNPJ</Label>
                      <Input
                        id="document"
                        value={formData.document ?? ""}
                        onChange={(event) => setFormData({ ...formData, document: event.target.value })}
                        placeholder="000.000.000-00"
                        data-testid="input-client-document"
                      />
                    </div>

                    <div>
                      <Label htmlFor="source">Origem do lead</Label>
                      <Input
                        id="source"
                        value={formData.source ?? ""}
                        onChange={(event) => setFormData({ ...formData, source: event.target.value })}
                        placeholder="Indicação, Portais, Mídia..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="nextFollowUp">Próximo follow-up</Label>
                      <Input
                        id="nextFollowUp"
                        type="datetime-local"
                        value={(formData.nextFollowUp as string) ?? ""}
                        onChange={(event) => setFormData({ ...formData, nextFollowUp: event.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={tagsInput}
                        onChange={(event) => setTagsInput(event.target.value)}
                        placeholder="premium, corporativo, aluguel"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address ?? ""}
                      onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                      placeholder="Endereço completo"
                      data-testid="input-client-address"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes ?? ""}
                      onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                      placeholder="Observações sobre o cliente..."
                      data-testid="textarea-client-notes"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingClient(null);
                        resetForm();
                      }}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-client"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Salvando..."
                        : editingClient
                        ? "Atualizar"
                        : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {clients && clients.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece cadastrando seu primeiro cliente para gerenciar seus relacionamentos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="clients-grid">
              {clients?.map((client) => (
                <Card key={client.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <CardTitle className="text-lg flex items-center gap-2" data-testid={`client-name-${client.id}`}>
                          <User className="w-5 h-5 text-muted-foreground" />
                          {client.name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className={getStageBadgeClass(client.stage)}>
                            {getStageLabel(client.stage)}
                          </Badge>
                          <Badge variant="outline">{getClientTypeLabel(client.type)}</Badge>
                          {client.source ? (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Tag className="h-3.5 w-3.5" /> {client.source}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEdit(client)}
                          data-testid={`button-edit-${client.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => deleteMutation.mutate(client.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${client.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span data-testid={`client-email-${client.id}`}>{client.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4" />
                        <span data-testid={`client-phone-${client.id}`}>{client.phone}</span>
                      </div>
                      {client.document ? (
                        <div className="flex items-center gap-2">
                          <NotebookPen className="w-4 h-4" />
                          <span>CPF/CNPJ: {client.document}</span>
                        </div>
                      ) : null}
                      {client.address ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{client.address}</span>
                        </div>
                      ) : null}
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Valor estimado</span>
                        <span className="font-medium">
                          {client.pipelineValue ? CURRENCY_FORMATTER.format(Number(client.pipelineValue)) : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Último contato</span>
                        <span className="font-medium">{formatDateTime(client.lastContactAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Próximo follow-up</span>
                        <span className="font-medium">{formatDateTime(client.nextFollowUp)}</span>
                      </div>
                    </div>

                    {client.notes ? (
                      <div className="rounded-md bg-muted/50 p-3 text-sm">
                        <p className="font-medium text-muted-foreground mb-1">Observações</p>
                        <p>{client.notes}</p>
                      </div>
                    ) : null}

                    {(client.tags ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {(client.tags ?? []).map((tag) => (
                          <Badge key={tag} variant="outline">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>Criado em {formatDate(client.createdAt)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setSelectedClient(client);
                          resetInteractionForm(client);
                          setIsInteractionDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" /> Interações
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          setSelectedClientForAppointment(client);
                          resetAppointmentForm();
                          setIsAppointmentDialogOpen(true);
                        }}
                      >
                        <Handshake className="w-4 h-4 mr-2" /> Agendar compromisso
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={isInteractionDialogOpen}
        onOpenChange={(open) => {
          setIsInteractionDialogOpen(open);
          if (!open) {
            setSelectedClient(null);
            resetInteractionForm();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {selectedClient ? `Histórico de interações - ${selectedClient.name}` : "Registro de interações"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Nova interação</h3>
              <form onSubmit={handleInteractionSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={interactionForm.type}
                      onValueChange={(value) => setInteractionForm({ ...interactionForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERACTION_TYPES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Canal</Label>
                    <Select
                      value={interactionForm.channel}
                      onValueChange={(value) => setInteractionForm({ ...interactionForm, channel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERACTION_CHANNELS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data do contato</Label>
                    <Input
                      type="datetime-local"
                      value={interactionForm.occurredAt}
                      onChange={(event) => setInteractionForm({ ...interactionForm, occurredAt: event.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Próximo follow-up</Label>
                    <Input
                      type="datetime-local"
                      value={interactionForm.nextFollowUp ?? ""}
                      onChange={(event) => setInteractionForm({ ...interactionForm, nextFollowUp: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Input
                      value={interactionForm.createdBy}
                      onChange={(event) => setInteractionForm({ ...interactionForm, createdBy: event.target.value })}
                      placeholder="Seu nome ou do corretor"
                    />
                  </div>
                  <div>
                    <Label>Atualizar estágio</Label>
                    <Select
                      value={interactionForm.stage ?? selectedClient?.stage ?? ""}
                      onValueChange={(value) => setInteractionForm({ ...interactionForm, stage: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Manter estágio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Manter estágio atual</SelectItem>
                        {CLIENT_STAGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Resumo da interação *</Label>
                  <Textarea
                    value={interactionForm.summary}
                    onChange={(event) => setInteractionForm({ ...interactionForm, summary: event.target.value })}
                    placeholder="Detalhe o que foi alinhado com o cliente"
                    required
                  />
                </div>

                <div>
                  <Label>Próximos passos</Label>
                  <Textarea
                    value={interactionForm.nextSteps}
                    onChange={(event) => setInteractionForm({ ...interactionForm, nextSteps: event.target.value })}
                    placeholder="Defina as ações a serem tomadas"
                  />
                </div>

                <Button type="submit" disabled={interactionMutation.isPending} className="w-full">
                  {interactionMutation.isPending ? "Registrando..." : "Registrar interação"}
                </Button>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Histórico recente</h3>
              <ScrollArea className="h-80 rounded-md border">
                <div className="p-4 space-y-4">
                  {isLoadingInteractions ? (
                    <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                  ) : interactions && interactions.length > 0 ? (
                    interactions.map((interaction) => (
                      <div key={interaction.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{getStageLabel(interaction.stage ?? selectedClient?.stage ?? "")}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(interaction.occurredAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{interaction.summary}</p>
                        {interaction.nextSteps ? (
                          <p className="text-xs text-muted-foreground">Próximos passos: {interaction.nextSteps}</p>
                        ) : null}
                        {interaction.nextFollowUp ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(interaction.nextFollowUp)}
                          </p>
                        ) : null}
                        {interaction.createdBy ? (
                          <p className="text-xs text-muted-foreground">Registrado por {interaction.createdBy}</p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma interação registrada ainda. Utilize o formulário ao lado para registrar o primeiro contato.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAppointmentDialogOpen}
        onOpenChange={(open) => {
          setIsAppointmentDialogOpen(open);
          if (!open) {
            setSelectedClientForAppointment(null);
            resetAppointmentForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {selectedClientForAppointment
                ? `Agendar compromisso - ${selectedClientForAppointment.name}`
                : "Agendar compromisso"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAppointmentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de compromisso</Label>
                <Select
                  value={appointmentForm.type}
                  onValueChange={(value) => setAppointmentForm({ ...appointmentForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={appointmentForm.status}
                  onValueChange={(value) => setAppointmentForm({ ...appointmentForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_STATUS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={appointmentForm.scheduledAt}
                  onChange={(event) => setAppointmentForm({ ...appointmentForm, scheduledAt: event.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Duração (minutos)</Label>
                <Input
                  type="number"
                  value={appointmentForm.durationMinutes}
                  min={15}
                  step={15}
                  onChange={(event) => setAppointmentForm({ ...appointmentForm, durationMinutes: Number(event.target.value) })}
                />
              </div>

              <div>
                <Label>Imóvel relacionado</Label>
                <Select
                  value={appointmentForm.propertyId ?? ""}
                  onValueChange={(value) => setAppointmentForm({ ...appointmentForm, propertyId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um imóvel (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem vínculo</SelectItem>
                    {properties?.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Canal</Label>
                <Input
                  value={appointmentForm.channel}
                  onChange={(event) => setAppointmentForm({ ...appointmentForm, channel: event.target.value })}
                  placeholder="Presencial, vídeo, telefone..."
                />
              </div>

              <div>
                <Label>Responsável</Label>
                <Input
                  value={appointmentForm.agentName}
                  onChange={(event) => setAppointmentForm({ ...appointmentForm, agentName: event.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={appointmentForm.notes}
                onChange={(event) => setAppointmentForm({ ...appointmentForm, notes: event.target.value })}
                placeholder="Adicione orientações importantes para a visita"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAppointmentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={appointmentMutation.isPending}>
                {appointmentMutation.isPending ? "Agendando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
