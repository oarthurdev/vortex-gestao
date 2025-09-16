import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, File, FileText, Home, User, Calendar as CalendarIcon, Edit, Trash2, CheckCircle, Clock, AlertCircle, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Contract, InsertContract, Property, Client } from "@shared/schema";

interface ContractWithDetails extends Contract {
  property: {
    id: string;
    title: string;
    address: string;
  };
  client: {
    id: string;
    name: string;
    email: string;
  };
}

export default function Contracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<Partial<InsertContract>>({
    type: "locacao",
    propertyId: "",
    clientId: "",
    value: "",
    status: "ativo",
    startDate: new Date(),
    endDate: undefined,
    terms: "",
    commission: "",
  });
  const [activeTab, setActiveTab] = useState("all");

  // Fetch contracts with property and client details
  const { data: contracts, isLoading } = useQuery<ContractWithDetails[]>({
    queryKey: ["/api/contracts"],
  });

  // Fetch properties and clients for dropdowns
  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });
  
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Calculate summary metrics
  const summary = useMemo(() => {
    if (!contracts) return { totalContracts: 0, activeContracts: 0, monthlyRevenue: 0, expiringCount: 0 };
    
    const activeContracts = contracts.filter(c => c.status === 'ativo').length;
    
    const monthlyRevenue = contracts
      .filter(c => c.status === 'ativo' && c.type === 'locacao')
      .reduce((sum, c) => sum + parseFloat(c.value), 0);
    
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const expiringCount = contracts.filter(c => 
      c.status === 'ativo' && 
      c.endDate && 
      new Date(c.endDate) <= nextMonth && 
      new Date(c.endDate) >= now
    ).length;
    
    return {
      totalContracts: contracts.length,
      activeContracts,
      monthlyRevenue,
      expiringCount
    };
  }, [contracts]);

  // Filter contracts based on active tab
  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    
    switch (activeTab) {
      case 'locacao':
        return contracts.filter(c => c.type === 'locacao');
      case 'venda':
        return contracts.filter(c => c.type === 'venda');
      case 'ativo':
        return contracts.filter(c => c.status === 'ativo');
      case 'vencido':
        const today = new Date();
        return contracts.filter(c => c.endDate && new Date(c.endDate) < today);
      default:
        return contracts;
    }
  }, [contracts, activeTab]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertContract) => {
      const res = await apiRequest("POST", "/api/contracts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Contrato criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar contrato",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertContract> }) => {
      const res = await apiRequest("PUT", `/api/contracts/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setEditingContract(null);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Contrato atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar contrato",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/contracts/${id}`);
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Sucesso",
        description: "Contrato removido com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover contrato",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyId || !formData.clientId || !formData.value) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const submissionData: any = {
      ...formData,
      value: formData.value?.toString(),
      commission: formData.commission?.toString() || undefined,
      startDate: formData.startDate!,
      endDate: formData.endDate,
    };
    
    // Clean up empty optional fields
    if (!submissionData.commission) {
      delete submissionData.commission;
    }
    if (!submissionData.terms) {
      delete submissionData.terms;
    }
    if (!submissionData.endDate) {
      delete submissionData.endDate;
    }

    if (editingContract) {
      updateMutation.mutate({ id: editingContract.id, data: submissionData });
    } else {
      createMutation.mutate(submissionData);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "locacao",
      propertyId: "",
      clientId: "",
      value: "",
      status: "ativo",
      startDate: new Date(),
      endDate: undefined,
      terms: "",
      commission: "",
    });
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      ...contract,
      startDate: new Date(contract.startDate),
      endDate: contract.endDate ? new Date(contract.endDate) : undefined,
    });
    setIsCreateDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ativo: "default",
      vencido: "destructive", 
      cancelado: "secondary",
      renovado: "outline",
    } as const;

    const icons = {
      ativo: CheckCircle,
      vencido: AlertCircle,
      cancelado: Clock,
      renovado: FileText,
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status === 'ativo' ? 'Ativo' : 
         status === 'vencido' ? 'Vencido' : 
         status === 'cancelado' ? 'Cancelado' :
         status === 'renovado' ? 'Renovado' : status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant={type === 'locacao' ? 'outline' : 'secondary'} className="flex items-center gap-1">
        {type === 'locacao' ? <Home className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
        {type === 'locacao' ? 'Locação' : 'Venda'}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Contratos" subtitle="Gerencie contratos de locação e venda" />
        
        <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="contracts-content">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Contratos</CardTitle>
                <File className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {summary.totalContracts}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {summary.activeContracts}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R$ {(summary.monthlyRevenue / 1000).toFixed(1)}K
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencendo em 30 dias</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {summary.expiringCount}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions and Filters */}
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="locacao">Locação</TabsTrigger>
                <TabsTrigger value="venda">Venda</TabsTrigger>
                <TabsTrigger value="ativo">Ativos</TabsTrigger>
                <TabsTrigger value="vencido">Vencidos</TabsTrigger>
              </TabsList>
            </Tabs>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-contract">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Contrato
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingContract ? "Editar Contrato" : "Novo Contrato"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Contrato</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as "locacao" | "venda" })}
                    >
                      <SelectTrigger data-testid="select-contract-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="locacao">Locação</SelectItem>
                        <SelectItem value="venda">Venda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="propertyId">Imóvel</Label>
                    <Select
                      value={formData.propertyId}
                      onValueChange={(value) => setFormData({ ...formData, propertyId: value })}
                    >
                      <SelectTrigger data-testid="select-contract-property">
                        <SelectValue placeholder="Selecionar imóvel" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties?.filter(p => p.status === 'disponivel' || (editingContract && p.id === formData.propertyId)).map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.title} - {property.neighborhood}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientId">Cliente</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                    >
                      <SelectTrigger data-testid="select-contract-client">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} - {client.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="value">Valor (R$)</Label>
                    <Input
                      id="value"
                      data-testid="input-contract-value"
                      type="number"
                      step="0.01"
                      value={formData.value || ""}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground"
                          )}
                          data-testid="button-select-start-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? format(formData.startDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => setFormData({ ...formData, startDate: date || new Date() })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data de Término (opcional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground"
                          )}
                          data-testid="button-select-end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate ? format(formData.endDate, "PPP", { locale: ptBR }) : "Selecionar data (opcional)"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate || undefined}
                          onSelect={(date) => setFormData({ ...formData, endDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commission">Comissão % (opcional)</Label>
                    <Input
                      id="commission"
                      data-testid="input-contract-commission"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.commission || ""}
                      onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                      placeholder="Ex: 5.50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as "ativo" | "vencido" | "cancelado" | "renovado" })}
                    >
                      <SelectTrigger data-testid="select-contract-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                        <SelectItem value="renovado">Renovado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="terms">Termos e Condições (opcional)</Label>
                    <Textarea
                      id="terms"
                      data-testid="input-contract-terms"
                      value={formData.terms || ""}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      placeholder="Descreva termos especiais do contrato..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingContract(null);
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      data-testid="button-submit-contract"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingContract ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Contracts List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="text-lg text-muted-foreground">Carregando contratos...</div>
              </div>
            ) : !filteredContracts.length ? (
              <div className="text-center py-12">
                <File className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhum contrato encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'all' ? 'Comece criando seu primeiro contrato' : `Nenhum contrato ${activeTab} encontrado`}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredContracts.map((contract) => (
                  <Card key={contract.id} data-testid={`card-contract-${contract.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-3 rounded-lg ${
                              contract.type === 'locacao' 
                                ? 'bg-blue-100 dark:bg-blue-900' 
                                : 'bg-green-100 dark:bg-green-900'
                            }`}>
                              {contract.type === 'locacao' ? (
                                <Home className="w-5 h-5 text-blue-600" />
                              ) : (
                                <DollarSign className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg" data-testid={`text-contract-title-${contract.id}`}>
                                {contract.property?.title || 'Propriedade não encontrada'}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                <User className="w-4 h-4 inline mr-1" />
                                {contract.client?.name || 'Cliente não encontrado'} • 
                                <span className="ml-1">{contract.client?.email}</span>
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                <Home className="w-4 h-4 inline mr-1" />
                                {contract.property?.address || 'Endereço não encontrado'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Valor</p>
                              <p className="font-medium" data-testid={`text-contract-value-${contract.id}`}>
                                R$ {parseFloat(contract.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Início</p>
                              <p className="font-medium">
                                {format(new Date(contract.startDate), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Término</p>
                              <p className="font-medium">
                                {contract.endDate 
                                  ? format(new Date(contract.endDate), "dd/MM/yyyy", { locale: ptBR })
                                  : 'Indeterminado'
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Comissão</p>
                              <p className="font-medium">
                                {contract.commission ? `${parseFloat(contract.commission)}%` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-4">
                          <div className="flex items-center gap-2">
                            {getTypeBadge(contract.type)}
                            {getStatusBadge(contract.status)}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(contract)}
                              data-testid={`button-edit-${contract.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteMutation.mutate(contract.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${contract.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {contract.terms && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            <strong>Termos:</strong> {contract.terms}
                          </p>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                        Criado em {format(new Date(contract.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {contract.updatedAt && new Date(contract.updatedAt) > new Date(contract.createdAt) && (
                          <span> • Atualizado em {format(new Date(contract.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
