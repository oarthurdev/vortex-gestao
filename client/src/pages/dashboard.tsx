import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import KPICards from "@/components/dashboard/kpi-cards";
import RevenueChart from "@/components/dashboard/revenue-chart";
import RecentActivities from "@/components/dashboard/recent-activities";
import PropertiesOverview from "@/components/dashboard/properties-overview";
import ContractsFinancials from "@/components/dashboard/contracts-financials";
import NotificationToast from "@/components/shared/notification-toast";
import { useState } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  useWebSocket(user?.companyId || null, (message) => {
    setNotificationMessage(message.title);
    setShowNotification(true);
    
    toast({
      title: message.title,
      description: message.description,
    });
  });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title="Dashboard" 
          subtitle="Visão geral do seu negócio"
        />
        
        <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="dashboard-content">
          <KPICards />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RevenueChart />
            <RecentActivities />
          </div>

          <PropertiesOverview />
          <ContractsFinancials />
        </div>
      </main>

      <NotificationToast 
        show={showNotification}
        message={notificationMessage}
        onClose={() => setShowNotification(false)}
      />
    </div>
  );
}
