import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RevenueChart() {
  const months = ["Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const values = [45, 60, 35, 80, 70, 85];

  return (
    <Card className="lg:col-span-2" data-testid="revenue-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Receita dos Últimos 6 Meses
          </CardTitle>
          <Select defaultValue="6months">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="1year">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end space-x-2" data-testid="chart-bars">
          {values.map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full rounded-t transition-all duration-300 ${
                  index === values.length - 1 ? "bg-primary" : "bg-primary/20"
                }`}
                style={{ height: `${value}%` }}
                data-testid={`chart-bar-${index}`}
              ></div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          {months.map((month, index) => (
            <span key={index} data-testid={`chart-month-${index}`}>
              {month}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
