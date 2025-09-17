import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, TrendingUp, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Contract, Transaction } from "@shared/schema";

export default function ContractsFinancials() {
  const { data: contracts, isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const isLoading = contractsLoading || transactionsLoading;

  // Get contracts expiring soon (next 60 days)
  const getExpiringContracts = () => {
    if (!contracts) return [];
    
    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(now.getDate() + 60);
    
    return contracts
      .filter(contract => 
        contract.status === 'ativo' && 
        contract.endDate && 
        new Date(contract.endDate) <= sixtyDaysFromNow &&
        new Date(contract.endDate) >= now
      )
      .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
      .slice(0, 3);
  };

  // Calculate financial summary
  const getFinancialSummary = () => {
    if (!transactions) {
      return {
        receivable: 0,
        payable: 0,
        balance: 0
      };
    }

    const receivable = transactions
      .filter(t => t.type === 'receita' && t.status === 'pendente')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const payable = transactions
      .filter(t => t.type === 'despesa' && t.status === 'pendente')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const balance = receivable - payable;

    return { receivable, payable, balance };
  };

  const getDaysUntilExpiration = (endDate: string) => {
    const now = new Date();
    const expiration = new Date(endDate);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationBadgeColor = (daysUntil: number) => {
    if (daysUntil <= 15) {
      return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
    } else if (daysUntil <= 30) {
      return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200";
    } else {
      return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
    }
  };

  const getExpirationLabel = (daysUntil: number) => {
    if (daysUntil <= 15) return "Urgente";
    if (daysUntil <= 30) return "Atenção";
    return "Aviso";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Contracts Loading */}
        <Card data-testid="expiring-contracts-loading">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Contratos Vencendo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded"></div>
                    <div className="h-3 w-24 bg-muted rounded"></div>
                  </div>
                  <div className="h-5 w-16 bg-muted rounded-full"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Loading */}
        <Card data-testid="financial-summary-loading">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Financeiro Resumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-muted rounded"></div>
                    <div className="h-6 w-20 bg-muted rounded"></div>
                  </div>
                  <div className="h-6 w-6 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiringContracts = getExpiringContracts();
  const financial = getFinancialSummary();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="contracts-financials">
      {/* Expiring Contracts */}
      <Card data-testid="expiring-contracts">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Contratos Vencendo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expiringContracts.length === 0 ? (
              <div className="text-center py-4" data-testid="no-expiring-contracts">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum contrato vencendo nos próximos 60 dias
                </p>
              </div>
            ) : (
              expiringContracts.map((contract) => {
                const endDateString = contract.endDate
                  ? new Date(contract.endDate).toString()
                  : "";
                const daysUntil = endDateString
                  ? getDaysUntilExpiration(endDateString)
                  : 0;
                
                return (
                  <div 
                    key={contract.id} 
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    data-testid={`expiring-contract-${contract.id}`}
                  >
                    <div>
                      <p 
                        className="font-medium text-foreground"
                        data-testid={`contract-property-${contract.id}`}
                      >
                        Contrato de {contract.type === 'locacao' ? 'Locação' : 'Venda'}
                      </p>
                      <p 
                        className="text-sm text-muted-foreground"
                        data-testid={`contract-expiration-${contract.id}`}
                      >
                        Vence em {daysUntil} {daysUntil === 1 ? 'dia' : 'dias'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Valor: {formatCurrency(parseFloat(contract.value))}
                      </p>
                    </div>
                    <Badge 
                      className={getExpirationBadgeColor(daysUntil)} 
                      variant="secondary"
                      data-testid={`contract-urgency-${contract.id}`}
                    >
                      {getExpirationLabel(daysUntil)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
          
          {expiringContracts.length > 0 && (
            <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary/80 text-sm font-medium">
              Ver todos os contratos
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card data-testid="financial-summary">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Financeiro Resumo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Receivable */}
            <div 
              className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
              data-testid="financial-receivable"
            >
              <div>
                <p className="text-sm text-muted-foreground">Contas a Receber</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(financial.receivable)}
                </p>
              </div>
              <ArrowUp className="text-green-600 w-5 h-5" />
            </div>
            
            {/* Payable */}
            <div 
              className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
              data-testid="financial-payable"
            >
              <div>
                <p className="text-sm text-muted-foreground">Contas a Pagar</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(financial.payable)}
                </p>
              </div>
              <ArrowDown className="text-red-600 w-5 h-5" />
            </div>
            
            {/* Net Balance */}
            <div 
              className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
              data-testid="financial-balance"
            >
              <div>
                <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                <p className={`text-xl font-bold ${
                  financial.balance >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {formatCurrency(financial.balance)}
                </p>
              </div>
              <TrendingUp className="text-blue-600 w-5 h-5" />
            </div>
            
            <Button 
              className="w-full mt-4"
              data-testid="button-full-report"
            >
              Ver Relatório Completo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
