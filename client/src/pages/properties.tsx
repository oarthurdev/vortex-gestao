import { useState } from "react";
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
import { Plus, Home, Bed, Bath, Car, MapPin, Edit, Trash2 } from "lucide-react";
import type { Property, InsertProperty } from "@shared/schema";

export default function Properties() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<Partial<InsertProperty>>({
    title: "",
    description: "",
    type: "apartamento",
    status: "disponivel",
    price: "",
    area: "",
    bedrooms: 0,
    bathrooms: 0,
    parkingSpaces: 0,
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const res = await apiRequest("POST", "/api/properties", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Imóvel criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar imóvel",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProperty> }) => {
      const res = await apiRequest("PUT", `/api/properties/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setEditingProperty(null);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Imóvel atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar imóvel",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Sucesso",
        description: "Imóvel excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir imóvel",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "apartamento",
      status: "disponivel",
      price: "",
      area: "",
      bedrooms: 0,
      bathrooms: 0,
      parkingSpaces: 0,
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data: formData });
    } else {
      createMutation.mutate(formData as InsertProperty);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData(property);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "disponivel":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "alugado":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "vendido":
        return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200";
      case "manutencao":
        return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "disponivel":
        return "Disponível";
      case "alugado":
        return "Alugado";
      case "vendido":
        return "Vendido";
      case "manutencao":
        return "Manutenção";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Imóveis" subtitle="Gerencie seus imóveis" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Carregando imóveis...</p>
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
        <TopBar title="Imóveis" subtitle="Gerencie seus imóveis" />
        
        <div className="flex-1 overflow-auto p-6" data-testid="properties-content">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Lista de Imóveis</h2>
              <p className="text-muted-foreground">
                {properties?.length || 0} imóveis cadastrados
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen || !!editingProperty} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingProperty(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-property">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Imóvel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-property-form">
                <DialogHeader>
                  <DialogTitle>
                    {editingProperty ? "Editar Imóvel" : "Novo Imóvel"}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Título *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Apartamento 3 quartos"
                        data-testid="input-property-title"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="type">Tipo *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                        data-testid="select-property-type"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartamento">Apartamento</SelectItem>
                          <SelectItem value="casa">Casa</SelectItem>
                          <SelectItem value="comercial">Comercial</SelectItem>
                          <SelectItem value="terreno">Terreno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                        data-testid="select-property-status"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponivel">Disponível</SelectItem>
                          <SelectItem value="alugado">Alugado</SelectItem>
                          <SelectItem value="vendido">Vendido</SelectItem>
                          <SelectItem value="manutencao">Manutenção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="price">Preço (R$) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        data-testid="input-property-price"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="area">Área (m²)</Label>
                      <Input
                        id="area"
                        type="number"
                        step="0.01"
                        value={formData.area ?? ""}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        placeholder="0.00"
                        data-testid="input-property-area"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="bedrooms">Quartos</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        value={formData.bedrooms ?? ""}
                        onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                        data-testid="input-property-bedrooms"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="bathrooms">Banheiros</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        value={formData.bathrooms ?? ""}
                        onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                        data-testid="input-property-bathrooms"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="parkingSpaces">Vagas</Label>
                      <Input
                        id="parkingSpaces"
                        type="number"
                        value={formData.parkingSpaces ?? ""}
                        onChange={(e) => setFormData({ ...formData, parkingSpaces: parseInt(e.target.value) || 0 })}
                        data-testid="input-property-parking"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description ?? ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva o imóvel..."
                      data-testid="textarea-property-description"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="address">Endereço *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Rua, número, complemento"
                        data-testid="input-property-address"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        data-testid="input-property-neighborhood"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        data-testid="input-property-city"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="Ex: SP"
                        data-testid="input-property-state"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="zipCode">CEP *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="00000-000"
                        data-testid="input-property-zipcode"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingProperty(null);
                        resetForm();
                      }}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-property"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Salvando..."
                        : editingProperty
                        ? "Atualizar"
                        : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {properties && properties.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum imóvel encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece cadastrando seu primeiro imóvel para começar a gerenciar seu negócio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="properties-grid">
              {properties?.map((property) => (
                <Card key={property.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(property.status)} variant="secondary">
                        {getStatusLabel(property.status)}
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(property)}
                          data-testid={`button-edit-${property.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMutation.mutate(property.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${property.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg" data-testid={`property-title-${property.id}`}>
                      {property.title}
                    </CardTitle>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm" data-testid={`property-location-${property.id}`}>
                        {property.neighborhood}, {property.city} - {property.state}
                      </span>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-primary" data-testid={`property-price-${property.id}`}>
                        R$ {parseFloat(property.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      
                      {property.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {property.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        {property.bedrooms && (
                          <div className="flex items-center">
                            <Bed className="w-4 h-4 mr-1" />
                            <span>{property.bedrooms} quartos</span>
                          </div>
                        )}
                        
                        {property.bathrooms && (
                          <div className="flex items-center">
                            <Bath className="w-4 h-4 mr-1" />
                            <span>{property.bathrooms} banheiros</span>
                          </div>
                        )}
                        
                        {property.parkingSpaces && (
                          <div className="flex items-center">
                            <Car className="w-4 h-4 mr-1" />
                            <span>{property.parkingSpaces} vagas</span>
                          </div>
                        )}
                      </div>
                      
                      {property.area && (
                        <div className="text-sm text-muted-foreground">
                          Área: {property.area} m²
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
