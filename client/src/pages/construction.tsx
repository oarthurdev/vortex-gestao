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
import { Progress } from "@/components/ui/progress";
import { Plus, HardHat, Building, Clock, CheckCircle, AlertCircle, Calendar as CalendarIcon, Edit, Trash2, Eye, DollarSign, TrendingUp, Pause, X, Home } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Construction, InsertConstruction, Property, ConstructionWithDetails, ConstructionTask, InsertConstructionTask, ConstructionExpense, InsertConstructionExpense } from "@shared/schema";

export default function Construction() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConstruction, setEditingConstruction] = useState<Construction | null>(null);
  const [selectedConstruction, setSelectedConstruction] = useState<ConstructionWithDetails | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ConstructionTask | null>(null);
  const [editingExpense, setEditingExpense] = useState<ConstructionExpense | null>(null);
  const [taskFormData, setTaskFormData] = useState<Partial<InsertConstructionTask>>({
    name: "",
    description: "",
    status: "pendente",
    priority: "media",
    startDate: undefined,
    endDate: undefined,
    assignedTo: "",
    estimatedCost: "",
    actualCost: "",
    progress: 0,
    order: 0,
  });
  const [expenseFormData, setExpenseFormData] = useState<Partial<InsertConstructionExpense>>({
    description: "",
    category: "material",
    amount: "",
    expenseDate: new Date(),
    supplier: "",
    receipt: "",
    notes: "",
  });
  const [activeTab, setActiveTab] = useState("all");
  const [formData, setFormData] = useState<Partial<InsertConstruction>>({
    name: "",
    description: "",
    propertyId: "",
    status: "planejamento",
    budget: "",
    startDate: undefined,
    endDate: undefined,
    expectedEndDate: undefined,
    progress: 0,
    contractor: "",
    contractorContact: "",
    notes: "",
  });

  // Fetch constructions with details
  const { data: constructions, isLoading } = useQuery<ConstructionWithDetails[]>({
    queryKey: ["/api/constructions"],
  });

  // Fetch properties for dropdown
  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Fetch tasks for selected construction
  const { data: constructionTasks } = useQuery<ConstructionTask[]>({
    queryKey: ["/api/constructions", selectedConstruction?.id, "tasks"],
    enabled: !!selectedConstruction?.id,
  });

  // Fetch expenses for selected construction
  const { data: constructionExpenses } = useQuery<ConstructionExpense[]>({
    queryKey: ["/api/constructions", selectedConstruction?.id, "expenses"],
    enabled: !!selectedConstruction?.id,
  });

  // Calculate summary metrics
  const summary = useMemo(() => {
    if (!constructions) return { 
      totalConstructions: 0, 
      activeConstructions: 0, 
      totalBudget: 0, 
      completedConstructions: 0 
    };
    
    const activeConstructions = constructions.filter(c => c.status === 'em_andamento').length;
    const completedConstructions = constructions.filter(c => c.status === 'concluida').length;
    
    const totalBudget = constructions
      .reduce((sum, c) => sum + (parseFloat(c.budget || '0')), 0);
    
    return {
      totalConstructions: constructions.length,
      activeConstructions,
      totalBudget,
      completedConstructions
    };
  }, [constructions]);

  // Filter constructions based on active tab
  const filteredConstructions = useMemo(() => {
    if (!constructions) return [];
    
    switch (activeTab) {
      case 'planejamento':
        return constructions.filter(c => c.status === 'planejamento');
      case 'em_andamento':
        return constructions.filter(c => c.status === 'em_andamento');
      case 'pausada':
        return constructions.filter(c => c.status === 'pausada');
      case 'concluida':
        return constructions.filter(c => c.status === 'concluida');
      case 'cancelada':
        return constructions.filter(c => c.status === 'cancelada');
      default:
        return constructions;
    }
  }, [constructions, activeTab]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertConstruction) => {
      const res = await apiRequest("POST", "/api/constructions", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constructions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Construção criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar construção",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertConstruction> }) => {
      const res = await apiRequest("PUT", `/api/constructions/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constructions"] });
      setEditingConstruction(null);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Construção atualizada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar construção",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/constructions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constructions"] });
      toast({
        title: "Sucesso",
        description: "Construção excluída com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir construção",
        variant: "destructive",
      });
    },
  });

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertConstructionTask) => {
      const res = await apiRequest("POST", `/api/constructions/${selectedConstruction?.id}/tasks`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constructions", selectedConstruction?.id, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constructions"] });
      setIsTaskDialogOpen(false);
      resetTaskForm();
      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar tarefa",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertConstructionTask> }) => {
      const res = await apiRequest("PUT", `/api/construction-tasks/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constructions", selectedConstruction?.id, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constructions"] });
      setEditingTask(null);
      resetTaskForm();
      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar tarefa",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/construction-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constructions", selectedConstruction?.id, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constructions"] });
      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir tarefa",
        variant: "destructive",
      });
    },
  });

  // Expense mutations
  const createExpenseMutation = useMutation({
    mutationFn: async (data: InsertConstructionExpense) => {
      const res = await apiRequest("POST", `/api/constructions/${selectedConstruction?.id}/expenses`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constructions", selectedConstruction?.id, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constructions"] });
      setIsExpenseDialogOpen(false);
      resetExpenseForm();
      toast({
        title: "Sucesso",
        description: "Despesa registrada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao registrar despesa",
        variant: "destructive",
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertConstructionExpense> }) => {
      const res = await apiRequest("PUT", `/api/construction-expenses/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constructions", selectedConstruction?.id, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constructions"] });
      setEditingExpense(null);
      resetExpenseForm();
      toast({
        title: "Sucesso",
        description: "Despesa atualizada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar despesa",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/construction-expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constructions", selectedConstruction?.id, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constructions"] });
      toast({
        title: "Sucesso",
        description: "Despesa excluída com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir despesa",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      propertyId: "",
      status: "planejamento",
      budget: "",
      startDate: undefined,
      endDate: undefined,
      expectedEndDate: undefined,
      progress: 0,
      contractor: "",
      contractorContact: "",
      notes: "",
    });
  };

  const resetTaskForm = () => {
    setTaskFormData({
      name: "",
      description: "",
      status: "pendente",
      priority: "media",
      startDate: undefined,
      endDate: undefined,
      assignedTo: "",
      estimatedCost: "",
      actualCost: "",
      progress: 0,
      order: 0,
    });
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      description: "",
      category: "material",
      amount: "",
      expenseDate: new Date(),
      supplier: "",
      receipt: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.propertyId) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const submissionData: any = {
      ...formData,
      budget: formData.budget?.toString() || undefined,
      progress: formData.progress || 0,
    };

    // Clean up empty optional fields
    Object.keys(submissionData).forEach(key => {
      if (submissionData[key] === "" || submissionData[key] === null) {
        delete submissionData[key];
      }
    });

    if (editingConstruction) {
      updateMutation.mutate({ id: editingConstruction.id, data: submissionData });
    } else {
      createMutation.mutate(submissionData);
    }
  };

  const handleEdit = (construction: Construction) => {
    setEditingConstruction(construction);
    setFormData({
      ...construction,
      startDate: construction.startDate ? new Date(construction.startDate) : undefined,
      endDate: construction.endDate ? new Date(construction.endDate) : undefined,
      expectedEndDate: construction.expectedEndDate ? new Date(construction.expectedEndDate) : undefined,
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskFormData.name) {
      toast({
        title: "Erro",
        description: "Nome da tarefa é obrigatório",
        variant: "destructive",
      });
      return;
    }

    const submissionData: any = {
      ...taskFormData,
      estimatedCost: taskFormData.estimatedCost?.toString() || undefined,
      actualCost: taskFormData.actualCost?.toString() || undefined,
    };

    // Clean up empty optional fields
    Object.keys(submissionData).forEach(key => {
      if (submissionData[key] === "" || submissionData[key] === null) {
        delete submissionData[key];
      }
    });

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: submissionData });
    } else {
      createTaskMutation.mutate(submissionData);
    }
  };

  const handleEditTask = (task: ConstructionTask) => {
    setEditingTask(task);
    setTaskFormData({
      ...task,
      startDate: task.startDate ? new Date(task.startDate) : undefined,
      endDate: task.endDate ? new Date(task.endDate) : undefined,
    });
    setIsTaskDialogOpen(true);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseFormData.description || !expenseFormData.amount) {
      toast({
        title: "Erro",
        description: "Descrição e valor são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const submissionData: any = {
      ...expenseFormData,
      amount: expenseFormData.amount?.toString(),
    };

    // Clean up empty optional fields
    Object.keys(submissionData).forEach(key => {
      if (submissionData[key] === "" || submissionData[key] === null) {
        delete submissionData[key];
      }
    });

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data: submissionData });
    } else {
      createExpenseMutation.mutate(submissionData);
    }
  };

  const handleEditExpense = (expense: ConstructionExpense) => {
    setEditingExpense(expense);
    setExpenseFormData({
      ...expense,
      expenseDate: new Date(expense.expenseDate),
    });
    setIsExpenseDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      planejamento: "secondary",
      em_andamento: "default",
      pausada: "destructive",
      concluida: "outline",
      cancelada: "destructive",
    } as const;

    const icons = {
      planejamento: Clock,
      em_andamento: Building,
      pausada: Pause,
      concluida: CheckCircle,
      cancelada: X,
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status === 'planejamento' ? 'Planejamento' : 
         status === 'em_andamento' ? 'Em Andamento' : 
         status === 'pausada' ? 'Pausada' :
         status === 'concluida' ? 'Concluída' : 
         status === 'cancelada' ? 'Cancelada' : status}
      </Badge>
    );
  };

  const getBudgetColor = (budget: string, spent: string) => {
    const budgetNum = parseFloat(budget || '0');
    const spentNum = parseFloat(spent || '0');
    const percentage = budgetNum > 0 ? (spentNum / budgetNum) * 100 : 0;
    
    if (percentage > 100) return "text-red-600 dark:text-red-400";
    if (percentage > 80) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Obras" subtitle="Gestão de projetos e construções" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Carregando obras...</p>
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
        <TopBar title="Obras" subtitle="Gestão de projetos e construções" />
        
        <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="construction-content">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Obras</CardTitle>
                <HardHat className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {summary.totalConstructions}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                <Building className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {summary.activeConstructions}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orçamento Total</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {(summary.totalBudget / 1000).toFixed(1)}K
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {summary.completedConstructions}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions and Filters */}
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="planejamento">Planejamento</TabsTrigger>
                <TabsTrigger value="em_andamento">Em Andamento</TabsTrigger>
                <TabsTrigger value="pausada">Pausadas</TabsTrigger>
                <TabsTrigger value="concluida">Concluídas</TabsTrigger>
                <TabsTrigger value="cancelada">Canceladas</TabsTrigger>
              </TabsList>
            </Tabs>

            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingConstruction(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-construction">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Obra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingConstruction ? "Editar Obra" : "Nova Obra"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Obra *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Reforma Apartamento 101"
                      data-testid="input-construction-name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="propertyId">Imóvel *</Label>
                    <Select
                      value={formData.propertyId}
                      onValueChange={(value) => setFormData({ ...formData, propertyId: value })}
                    >
                      <SelectTrigger data-testid="select-construction-property">
                        <SelectValue placeholder="Selecionar imóvel" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties?.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.title} - {property.neighborhood}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                    >
                      <SelectTrigger data-testid="select-construction-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planejamento">Planejamento</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="pausada">Pausada</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget">Orçamento (R$)</Label>
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      value={formData.budget || ""}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="0.00"
                      data-testid="input-construction-budget"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contractor">Contratante</Label>
                    <Input
                      id="contractor"
                      value={formData.contractor || ""}
                      onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                      placeholder="Nome do contratante"
                      data-testid="input-construction-contractor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contractorContact">Contato do Contratante</Label>
                    <Input
                      id="contractorContact"
                      value={formData.contractorContact || ""}
                      onChange={(e) => setFormData({ ...formData, contractorContact: e.target.value })}
                      placeholder="Telefone ou email"
                      data-testid="input-construction-contractor-contact"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedEndDate">Data Prevista de Conclusão</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.expectedEndDate && "text-muted-foreground"
                          )}
                          data-testid="button-select-expected-end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expectedEndDate ? format(formData.expectedEndDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.expectedEndDate}
                          onSelect={(date) => setFormData({ ...formData, expectedEndDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva a obra..."
                      data-testid="textarea-construction-description"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingConstruction(null);
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      data-testid="button-submit-construction"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingConstruction ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Construction Details Modal */}
          <Dialog open={!!selectedConstruction} onOpenChange={(open) => {
            if (!open) {
              setSelectedConstruction(null);
              setIsTaskDialogOpen(false);
              setIsExpenseDialogOpen(false);
              setEditingTask(null);
              setEditingExpense(null);
              resetTaskForm();
              resetExpenseForm();
            }
          }}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  {selectedConstruction?.name}
                </DialogTitle>
              </DialogHeader>
              
              {selectedConstruction && (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="tasks">Tarefas</TabsTrigger>
                    <TabsTrigger value="expenses">Despesas</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {getStatusBadge(selectedConstruction.status)}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Progresso</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <Progress value={selectedConstruction.progress} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{selectedConstruction.progress}%</span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Orçamento</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm font-medium">
                            {selectedConstruction.budget ? `R$ ${parseFloat(selectedConstruction.budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Gasto</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-sm font-medium ${getBudgetColor(selectedConstruction.budget || '0', selectedConstruction.spent || '0')}`}>
                            R$ {parseFloat(selectedConstruction.spent || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Informações da Obra</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Imóvel</p>
                            <p className="font-medium">{selectedConstruction.property.title}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Endereço</p>
                            <p className="font-medium">{selectedConstruction.property.address}</p>
                          </div>
                          {selectedConstruction.contractor && (
                            <div>
                              <p className="text-sm text-muted-foreground">Contratante</p>
                              <p className="font-medium">{selectedConstruction.contractor}</p>
                            </div>
                          )}
                          {selectedConstruction.contractorContact && (
                            <div>
                              <p className="text-sm text-muted-foreground">Contato</p>
                              <p className="font-medium">{selectedConstruction.contractorContact}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Cronograma</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedConstruction.startDate && (
                            <div>
                              <p className="text-sm text-muted-foreground">Data de Início</p>
                              <p className="font-medium">{format(new Date(selectedConstruction.startDate), "PPP", { locale: ptBR })}</p>
                            </div>
                          )}
                          {selectedConstruction.expectedEndDate && (
                            <div>
                              <p className="text-sm text-muted-foreground">Previsão de Conclusão</p>
                              <p className="font-medium">{format(new Date(selectedConstruction.expectedEndDate), "PPP", { locale: ptBR })}</p>
                            </div>
                          )}
                          {selectedConstruction.endDate && (
                            <div>
                              <p className="text-sm text-muted-foreground">Data de Conclusão</p>
                              <p className="font-medium">{format(new Date(selectedConstruction.endDate), "PPP", { locale: ptBR })}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {selectedConstruction.notes && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Observações</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{selectedConstruction.notes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="tasks" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Tarefas</h3>
                      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => {
                        setIsTaskDialogOpen(open);
                        if (!open) {
                          setEditingTask(null);
                          resetTaskForm();
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Tarefa
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>
                              {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
                            </DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmitTask} className="space-y-4">
                            <div>
                              <Label htmlFor="task-name">Nome da Tarefa *</Label>
                              <Input
                                id="task-name"
                                value={taskFormData.name}
                                onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
                                placeholder="Ex: Instalação elétrica"
                                required
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="task-description">Descrição</Label>
                              <Textarea
                                id="task-description"
                                value={taskFormData.description || ""}
                                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                                placeholder="Descreva a tarefa..."
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="task-status">Status</Label>
                                <Select
                                  value={taskFormData.status}
                                  onValueChange={(value) => setTaskFormData({ ...taskFormData, status: value as any })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                    <SelectItem value="concluida">Concluída</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="task-priority">Prioridade</Label>
                                <Select
                                  value={taskFormData.priority}
                                  onValueChange={(value) => setTaskFormData({ ...taskFormData, priority: value as any })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="baixa">Baixa</SelectItem>
                                    <SelectItem value="media">Média</SelectItem>
                                    <SelectItem value="alta">Alta</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="task-assigned">Responsável</Label>
                              <Input
                                id="task-assigned"
                                value={taskFormData.assignedTo || ""}
                                onChange={(e) => setTaskFormData({ ...taskFormData, assignedTo: e.target.value })}
                                placeholder="Nome do responsável"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="task-estimated-cost">Custo Estimado (R$)</Label>
                                <Input
                                  id="task-estimated-cost"
                                  type="number"
                                  step="0.01"
                                  value={taskFormData.estimatedCost || ""}
                                  onChange={(e) => setTaskFormData({ ...taskFormData, estimatedCost: e.target.value })}
                                  placeholder="0.00"
                                />
                              </div>

                              <div>
                                <Label htmlFor="task-actual-cost">Custo Real (R$)</Label>
                                <Input
                                  id="task-actual-cost"
                                  type="number"
                                  step="0.01"
                                  value={taskFormData.actualCost || ""}
                                  onChange={(e) => setTaskFormData({ ...taskFormData, actualCost: e.target.value })}
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsTaskDialogOpen(false);
                                  setEditingTask(null);
                                  resetTaskForm();
                                }}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                                className="flex-1"
                                disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                              >
                                {editingTask ? "Atualizar" : "Criar"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-2">
                      {constructionTasks?.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Nenhuma tarefa cadastrada</p>
                        </div>
                      ) : (
                        constructionTasks?.map((task) => (
                          <Card key={task.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">{task.name}</h4>
                                    <Badge variant={task.status === 'concluida' ? 'default' : task.status === 'em_andamento' ? 'secondary' : 'outline'}>
                                      {task.status === 'pendente' ? 'Pendente' :
                                       task.status === 'em_andamento' ? 'Em Andamento' :
                                       'Concluída'}
                                    </Badge>
                                    <Badge variant={task.priority === 'alta' ? 'destructive' : task.priority === 'media' ? 'default' : 'secondary'}>
                                      {task.priority === 'baixa' ? 'Baixa' :
                                       task.priority === 'media' ? 'Média' :
                                       'Alta'}
                                    </Badge>
                                  </div>
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                                  )}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {task.assignedTo && (
                                      <div>
                                        <p className="text-muted-foreground">Responsável</p>
                                        <p className="font-medium">{task.assignedTo}</p>
                                      </div>
                                    )}
                                    {task.estimatedCost && (
                                      <div>
                                        <p className="text-muted-foreground">Custo Estimado</p>
                                        <p className="font-medium">R$ {parseFloat(task.estimatedCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                      </div>
                                    )}
                                    {task.actualCost && (
                                      <div>
                                        <p className="text-muted-foreground">Custo Real</p>
                                        <p className="font-medium">R$ {parseFloat(task.actualCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-muted-foreground">Progresso</p>
                                      <div className="flex items-center gap-2">
                                        <Progress value={task.progress} className="h-2 flex-1" />
                                        <span className="text-xs">{task.progress}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditTask(task)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteTaskMutation.mutate(task.id)}
                                    disabled={deleteTaskMutation.isPending}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="expenses" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Despesas</h3>
                      <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => {
                        setIsExpenseDialogOpen(open);
                        if (!open) {
                          setEditingExpense(null);
                          resetExpenseForm();
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Despesa
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>
                              {editingExpense ? "Editar Despesa" : "Nova Despesa"}
                            </DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmitExpense} className="space-y-4">
                            <div>
                              <Label htmlFor="expense-description">Descrição *</Label>
                              <Input
                                id="expense-description"
                                value={expenseFormData.description}
                                onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                                placeholder="Ex: Compra de cimento"
                                required
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="expense-category">Categoria</Label>
                                <Select
                                  value={expenseFormData.category}
                                  onValueChange={(value) => setExpenseFormData({ ...expenseFormData, category: value as any })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="material">Material</SelectItem>
                                    <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
                                    <SelectItem value="equipamento">Equipamento</SelectItem>
                                    <SelectItem value="outros">Outros</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="expense-amount">Valor (R$) *</Label>
                                <Input
                                  id="expense-amount"
                                  type="number"
                                  step="0.01"
                                  value={expenseFormData.amount}
                                  onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                                  placeholder="0.00"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="expense-supplier">Fornecedor</Label>
                              <Input
                                id="expense-supplier"
                                value={expenseFormData.supplier || ""}
                                onChange={(e) => setExpenseFormData({ ...expenseFormData, supplier: e.target.value })}
                                placeholder="Nome do fornecedor"
                              />
                            </div>

                            <div>
                              <Label htmlFor="expense-date">Data da Despesa</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !expenseFormData.expenseDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {expenseFormData.expenseDate ? format(expenseFormData.expenseDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={expenseFormData.expenseDate}
                                    onSelect={(date) => setExpenseFormData({ ...expenseFormData, expenseDate: date || new Date() })}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div>
                              <Label htmlFor="expense-notes">Observações</Label>
                              <Textarea
                                id="expense-notes"
                                value={expenseFormData.notes || ""}
                                onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                                placeholder="Observações sobre a despesa..."
                              />
                            </div>

                            <div className="flex gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsExpenseDialogOpen(false);
                                  setEditingExpense(null);
                                  resetExpenseForm();
                                }}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                                className="flex-1"
                                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                              >
                                {editingExpense ? "Atualizar" : "Registrar"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-2">
                      {constructionExpenses?.length === 0 ? (
                        <div className="text-center py-8">
                          <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Nenhuma despesa registrada</p>
                        </div>
                      ) : (
                        constructionExpenses?.map((expense) => (
                          <Card key={expense.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">{expense.description}</h4>
                                    <Badge variant="secondary">
                                      {expense.category === 'material' ? 'Material' :
                                       expense.category === 'mao_de_obra' ? 'Mão de Obra' :
                                       expense.category === 'equipamento' ? 'Equipamento' :
                                       'Outros'}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Valor</p>
                                      <p className="font-medium text-lg">R$ {parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Data</p>
                                      <p className="font-medium">{format(new Date(expense.expenseDate), "PPP", { locale: ptBR })}</p>
                                    </div>
                                    {expense.supplier && (
                                      <div>
                                        <p className="text-muted-foreground">Fornecedor</p>
                                        <p className="font-medium">{expense.supplier}</p>
                                      </div>
                                    )}
                                    {expense.notes && (
                                      <div>
                                        <p className="text-muted-foreground">Observações</p>
                                        <p className="font-medium">{expense.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditExpense(expense)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteExpenseMutation.mutate(expense.id)}
                                    disabled={deleteExpenseMutation.isPending}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>

          {/* Constructions List */}
          <div className="space-y-4">
            {!filteredConstructions.length ? (
              <div className="text-center py-12">
                <HardHat className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma obra encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'all' ? 'Comece criando sua primeira obra' : `Nenhuma obra ${activeTab} encontrada`}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredConstructions.map((construction) => (
                  <Card key={construction.id} data-testid={`card-construction-${construction.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(construction.status)}
                            </div>
                            <h3 className="text-lg font-semibold text-foreground" data-testid={`construction-name-${construction.id}`}>
                              {construction.name}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Imóvel</p>
                              <p className="font-medium" data-testid={`construction-property-${construction.id}`}>
                                {construction.property.title}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Progresso</p>
                              <div className="flex items-center gap-2">
                                <Progress value={construction.progress} className="h-2 flex-1" />
                                <span className="text-sm font-medium">{construction.progress}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Orçamento</p>
                              <p className="font-medium">
                                {construction.budget ? `R$ ${parseFloat(construction.budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Gasto</p>
                              <p className={`font-medium ${getBudgetColor(construction.budget || '0', construction.spent || '0')}`}>
                                R$ {parseFloat(construction.spent || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          {construction.expectedEndDate && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground">
                                Previsão de conclusão: {format(new Date(construction.expectedEndDate), "PPP", { locale: ptBR })}
                              </p>
                            </div>
                          )}

                          {construction.contractor && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground">
                                Contratante: <span className="font-medium">{construction.contractor}</span>
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedConstruction(construction)}
                            data-testid={`button-view-${construction.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(construction)}
                            data-testid={`button-edit-${construction.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(construction.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${construction.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
