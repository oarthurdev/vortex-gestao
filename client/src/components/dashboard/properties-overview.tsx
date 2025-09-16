import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Bed, Bath, Car } from "lucide-react";
import { Link } from "wouter";
import type { Property } from "@shared/schema";

export default function PropertiesOverview() {
  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "apartamento":
        return "Apartamento";
      case "casa":
        return "Casa";
      case "comercial":
        return "Comercial";
      case "terreno":
        return "Terreno";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="properties-overview-loading">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">
              Imóveis em Destaque
            </CardTitle>
            <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-muted"></div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-16 bg-muted rounded-full"></div>
                    <div className="h-6 w-20 bg-muted rounded"></div>
                  </div>
                  <div className="h-5 w-3/4 bg-muted rounded"></div>
                  <div className="h-4 w-1/2 bg-muted rounded"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 bg-muted rounded"></div>
                    <div className="h-4 w-16 bg-muted rounded"></div>
                    <div className="h-4 w-16 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show only featured properties (first 6 with status available, rented or sold)
  const featuredProperties = properties
    ?.filter(p => ['disponivel', 'alugado', 'vendido'].includes(p.status))
    .slice(0, 6) || [];

  return (
    <Card data-testid="properties-overview">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Imóveis em Destaque
          </CardTitle>
          <Link href="/properties">
            <Button variant="ghost" className="text-primary hover:text-primary/80 text-sm font-medium">
              Ver todos
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent>
        {featuredProperties.length === 0 ? (
          <div className="text-center py-8" data-testid="no-featured-properties">
            <p className="text-muted-foreground">
              Nenhum imóvel em destaque encontrado
            </p>
            <Link href="/properties">
              <Button variant="outline" className="mt-4">
                Cadastrar Imóvel
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="featured-properties-grid">
            {featuredProperties.map((property) => (
              <div 
                key={property.id} 
                className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                data-testid={`featured-property-${property.id}`}
              >
                {/* Property image placeholder */}
                <div className="w-full h-48 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-2">🏠</div>
                    <p className="text-sm">Foto do imóvel</p>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge 
                      className={getStatusColor(property.status)} 
                      variant="secondary"
                      data-testid={`property-status-${property.id}`}
                    >
                      {getStatusLabel(property.status)}
                    </Badge>
                    <span 
                      className="text-lg font-bold text-foreground"
                      data-testid={`property-price-${property.id}`}
                    >
                      R$ {parseFloat(property.price).toLocaleString('pt-BR', { 
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </span>
                  </div>
                  
                  <h4 
                    className="font-medium text-foreground mb-1"
                    data-testid={`property-title-${property.id}`}
                  >
                    {getTypeLabel(property.type)} - {property.title}
                  </h4>
                  
                  <div className="flex items-center text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4 mr-1" />
                    <p 
                      className="text-sm"
                      data-testid={`property-location-${property.id}`}
                    >
                      {property.neighborhood}, {property.city} - {property.state}
                    </p>
                  </div>
                  
                  <div className="flex items-center text-xs text-muted-foreground space-x-4">
                    {property.bedrooms && property.bedrooms > 0 && (
                      <span className="flex items-center">
                        <Bed className="w-4 h-4 mr-1" />
                        {property.bedrooms} quartos
                      </span>
                    )}
                    
                    {property.bathrooms && property.bathrooms > 0 && (
                      <span className="flex items-center">
                        <Bath className="w-4 h-4 mr-1" />
                        {property.bathrooms} banheiros
                      </span>
                    )}
                    
                    {property.parkingSpaces && property.parkingSpaces > 0 && (
                      <span className="flex items-center">
                        <Car className="w-4 h-4 mr-1" />
                        {property.parkingSpaces} vagas
                      </span>
                    )}
                  </div>
                  
                  {property.area && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Área: {property.area} m²
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
