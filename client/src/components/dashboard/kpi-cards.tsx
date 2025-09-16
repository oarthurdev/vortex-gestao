import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, DollarSign, File, Users } from "lucide-react";

interface KPIData {
  activeProperties: number;
  monthlyRevenue: string;
  activeContracts: number;
  monthlyLeads: number;
}

export default function KPICards() {
  const { data: kpis, isLoading } = useQuery<KPIData>({
    queryKey: ["/api/kpis"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-muted rounded-lg"></div>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <div className="h-4 bg-muted rounded w-12"></div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Imóveis Ativos",
      value: kpis?.activeProperties || 0,
      change: "+12%",
      icon: Building2,
      color: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
      testId: "kpi-active-properties"
    },
    {
      title: "Receita Mensal",
      value: kpis?.monthlyRevenue || "R$ 0",
      change: "+8.5%",
      icon: DollarSign,
      color: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
      testId: "kpi-monthly-revenue"
    },
    {
      title: "Contratos Ativos",
      value: kpis?.activeContracts || 0,
      change: "+3.2%",
      icon: File,
      color: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
      testId: "kpi-active-contracts"
    },
    {
      title: "Leads Este Mês",
      value: kpis?.monthlyLeads || 0,
      change: "-2.1%",
      icon: Users,
      color: "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400",
      testId: "kpi-monthly-leads"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="kpi-cards">
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositive = card.change.startsWith("+");
        
        return (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground" data-testid={card.testId}>
                    {card.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}>
                  {card.change}
                </span>
                <span className="text-muted-foreground text-sm ml-2">
                  vs mês anterior
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
