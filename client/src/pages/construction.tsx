import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat } from "lucide-react";

export default function Construction() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Obras" subtitle="Gestão de projetos e construções" />
        
        <div className="flex-1 overflow-auto p-6" data-testid="construction-content">
          <div className="text-center py-12">
            <HardHat className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Módulo de Obras</h3>
            <p className="text-muted-foreground mb-4">
              Esta funcionalidade está em desenvolvimento e será implementada em breve.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
