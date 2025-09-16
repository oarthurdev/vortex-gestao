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
import { Plus, DollarSign, TrendingUp, TrendingDown, Calendar as CalendarIcon, Edit, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Transaction, InsertTransaction, Contract, Property, Client } from "@shared/schema";

interface TransactionWithDetails extends Transaction {
  contract?: {
    id: string;
    property: {
      title: string;
    };
    client: {
      name: string;
    };
  };
}

export default function Financial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<Partial<InsertTransaction>>({
    type: "receita",
    category: "aluguel",
    description: "",
    amount: "",
    status: "pendente",
    dueDate: new Date(),
    paidDate: undefined,
    contractId: undefined,
  });
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date>();

  // Fetch transactions
  const { data: transactions, isLoading } = useQuery<TransactionWithDetails[]>({
    queryKey: ["/api/transactions"],
  });

  // Fetch contracts for the dropdown
  const { data: contracts } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  // Calculate summary metrics
  const summary = useMemo(() => {
    if (!transactions) return { totalReceitas: 0, totalDespesas: 0, saldoTotal: 0, pendentesCount: 0 };
    
    const receitas = transactions.filter(t => t.type === 'receita' && t.status === 'pago')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const despesas = transactions.filter(t => t.type === 'despesa' && t.status === 'pago')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const pendentesCount = transactions.filter(t => t.status === 'pendente').length;
    
    return {
      totalReceitas: receitas,
      totalDespesas: despesas,
      saldoTotal: receitas - despesas,
      pendentesCount
    };
  }, [transactions]);

  // Filter transactions based on active tab
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    switch (activeTab) {
      case 'receitas':
        return transactions.filter(t => t.type === 'receita');
      case 'despesas':
        return transactions.filter(t => t.type === 'despesa');
      case 'pendentes':
        return transactions.filter(t => t.status === 'pendente');
      case 'vencidas':
        const today = new Date();
        return transactions.filter(t => t.status === 'pendente' && new Date(t.dueDate) < today);
      default:
        return transactions;
    }
  }, [transactions, activeTab]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertTransaction) => {
      const res = await apiRequest("POST", "/api/transactions", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Transação criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar transação",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertTransaction> }) => {
      const res = await apiRequest("PUT", `/api/transactions/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setEditingTransaction(null);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Transação atualizada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar transação",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/transactions/${id}`);
      // DELETE returns 204 No Content, no need to parse JSON
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Sucesso",
        description: "Transação removida com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover transação",
        variant: "destructive",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/transactions/${id}`, {
        status: "pago",
        paidDate: new Date().toISOString(),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Sucesso",
        description: "Transação marcada como paga!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao marcar como paga",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.category) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const submissionData: any = {
      ...formData,
      amount: formData.amount?.toString(),
      dueDate: formData.dueDate!,
      paidDate: formData.paidDate,
    };
    
    // Remove contractId if it's empty or undefined to prevent validation issues
    if (!submissionData.contractId) {
      delete submissionData.contractId;
    }

    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data: submissionData });
    } else {
      createMutation.mutate(submissionData);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "receita",
      category: "aluguel",
      description: "",
      amount: "",
      status: "pendente",
      dueDate: new Date(),
      paidDate: undefined,
      contractId: undefined,
    });
    setSelectedDate(undefined);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      ...transaction,
      dueDate: new Date(transaction.dueDate),
      paidDate: transaction.paidDate ? new Date(transaction.paidDate) : undefined,
    });
    setIsCreateDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pendente: "secondary",
      pago: "default",
      vencido: "destructive",
    } as const;

    const icons = {
      pendente: Clock,
      pago: CheckCircle,
      vencido: AlertCircle,
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status === 'pendente' ? 'Pendente' : status === 'pago' ? 'Pago' : 'Vencido'}
      </Badge>
    );
  };

  const getCategoryDisplay = (category: string) => {
    const categories: Record<string, string> = {
      aluguel: "Aluguel",
      venda: "Venda",
      comissao: "Comissão",
      manutencao: "Manutenção",
      marketing: "Marketing",
      escritorio: "Escritório",
      outros: "Outros",
    };
    return categories[category] || category;
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Financeiro" subtitle="Controle de contas a pagar e receber" />
        
        <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="financial-content">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {(summary.totalReceitas / 1000).toFixed(1)}K
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  R$ {(summary.totalDespesas / 1000).toFixed(1)}K
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  summary.saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  R$ {(summary.saldoTotal / 1000).toFixed(1)}K
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {summary.pendentesCount}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions and Filters */}
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="receitas">Receitas</TabsTrigger>
                <TabsTrigger value="despesas">Despesas</TabsTrigger>
                <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
                <TabsTrigger value="vencidas">Vencidas</TabsTrigger>
              </TabsList>
            </Tabs>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-transaction">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingTransaction ? "Editar Transação" : "Nova Transação"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as "receita" | "despesa" })}
                    >
                      <SelectTrigger data-testid="select-transaction-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger data-testid="select-transaction-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aluguel">Aluguel</SelectItem>
                        <SelectItem value="venda">Venda</SelectItem>
                        <SelectItem value="comissao">Comissão</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="escritorio">Escritório</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      data-testid="input-transaction-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ex: Aluguel Apartamento Centro"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      id="amount"
                      data-testid="input-transaction-amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Data de Vencimento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dueDate && "text-muted-foreground"
                          )}
                          data-testid="button-select-due-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dueDate ? format(formData.dueDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dueDate}
                          onSelect={(date) => setFormData({ ...formData, dueDate: date || new Date() })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {contracts && contracts.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="contractId">Contrato (opcional)</Label>
                      <Select
                        value={formData.contractId || ""}
                        onValueChange={(value) => setFormData({ ...formData, contractId: value === "" ? undefined : value })}
                      >
                        <SelectTrigger data-testid="select-transaction-contract">
                          <SelectValue placeholder="Selecionar contrato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sem contrato</SelectItem>
                          {contracts.map((contract) => (
                            <SelectItem key={contract.id} value={contract.id}>
                              Contrato #{contract.id.slice(0, 8)} - {contract.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as "pendente" | "pago" | "vencido" })}
                    >
                      <SelectTrigger data-testid="select-transaction-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.status === "pago" && (
                    <div className="space-y-2">
                      <Label htmlFor="paidDate">Data de Pagamento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.paidDate && "text-muted-foreground"
                            )}
                            data-testid="button-select-paid-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.paidDate ? format(formData.paidDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.paidDate || undefined}
                            onSelect={(date) => setFormData({ ...formData, paidDate: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingTransaction(null);
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      data-testid="button-submit-transaction"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingTransaction ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Transactions List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="text-lg text-muted-foreground">Carregando transações...</div>
              </div>
            ) : !filteredTransactions.length ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma transação encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'all' ? 'Comece criando sua primeira transação' : `Nenhuma transação ${activeTab} encontrada`}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTransactions.map((transaction) => (
                  <Card key={transaction.id} data-testid={`card-transaction-${transaction.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-full ${
                              transaction.type === 'receita' 
                                ? 'bg-green-100 dark:bg-green-900' 
                                : 'bg-red-100 dark:bg-red-900'
                            }`}>
                              {transaction.type === 'receita' ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium" data-testid={`text-transaction-description-${transaction.id}`}>
                                {transaction.description}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {getCategoryDisplay(transaction.category)} • 
                                Vence em {format(new Date(transaction.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                                {transaction.paidDate && (
                                  <span> • Pago em {format(new Date(transaction.paidDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                            }`} data-testid={`text-transaction-amount-${transaction.id}`}>
                              {transaction.type === 'receita' ? '+' : '-'}R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(transaction.status)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {transaction.status === 'pendente' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsPaidMutation.mutate(transaction.id)}
                                disabled={markAsPaidMutation.isPending}
                                data-testid={`button-mark-paid-${transaction.id}`}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(transaction)}
                              data-testid={`button-edit-${transaction.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteMutation.mutate(transaction.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${transaction.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
