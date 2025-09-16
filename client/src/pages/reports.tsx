import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Reports() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Relatórios" subtitle="Análises e relatórios do negócio" />
        
        <div className="flex-1 overflow-auto p-6" data-testid="reports-content">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Módulo de Relatórios</h3>
            <p className="text-muted-foreground mb-4">
              Esta funcionalidade está em desenvolvimento e será implementada em breve.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
