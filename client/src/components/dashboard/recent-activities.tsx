import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Activity } from "@shared/schema";

export default function RecentActivities() {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const getActivityColor = (type: string) => {
    switch (type) {
      case "contract_signed":
        return "bg-green-500";
      case "lead_converted":
      case "lead_created":
        return "bg-blue-500";
      case "payment_overdue":
        return "bg-orange-500";
      case "property_created":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="recent-activities-loading">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-2 h-2 bg-muted rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="recent-activities">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Atividades Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities && activities.length === 0 ? (
            <div className="text-center py-4" data-testid="no-activities">
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade recente
              </p>
            </div>
          ) : (
            activities?.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3" data-testid={`activity-${activity.id}`}>
                <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.type)}`}></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground" data-testid={`activity-title-${activity.id}`}>
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`activity-time-${activity.id}`}>
                    {activity.description} • {formatDistanceToNow(new Date(activity.createdAt), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        
        <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary/80 text-sm font-medium">
          Ver todas as atividades
        </Button>
      </CardContent>
    </Card>
  );
}
