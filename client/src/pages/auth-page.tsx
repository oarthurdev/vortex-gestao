import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Mail, Lock, User, Phone, FileText, Eye, EyeOff } from "lucide-react";
import type { Company } from "@shared/schema";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
    companyId: "",
    rememberMe: false,
  });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    email: "",
    name: "",
    companyId: "",
    role: "corretor" as const,
  });

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({
      username: loginData.username,
      password: loginData.password,
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  if (user) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Authentication Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">imoGestão</h1>
            <p className="text-muted-foreground mt-2">Sistema de Gerenciamento Imobiliário</p>
          </div>

          <Tabs defaultValue="login" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2" data-testid="auth-tabs">
              <TabsTrigger value="login" data-testid="tab-login">Entrar</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="company">Empresa</Label>
                      <Select
                        value={loginData.companyId}
                        onValueChange={(value) => setLoginData({ ...loginData, companyId: value })}
                        data-testid="select-company-login"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sua empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {companiesLoading ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : (
                            companies?.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="username">Email/Usuário</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="seu@email.com"
                          className="pl-10"
                          value={loginData.username}
                          onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                          data-testid="input-username"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          data-testid="input-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={loginData.rememberMe}
                          onCheckedChange={(checked) =>
                            setLoginData({ ...loginData, rememberMe: checked as boolean })
                          }
                          data-testid="checkbox-remember"
                        />
                        <Label htmlFor="remember" className="text-sm text-muted-foreground">
                          Lembrar-me
                        </Label>
                      </div>
                      <Button variant="link" size="sm" className="p-0 h-auto text-primary">
                        Esqueci a senha
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending || !loginData.companyId}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="register-company">Empresa</Label>
                      <Select
                        value={registerData.companyId}
                        onValueChange={(value) => setRegisterData({ ...registerData, companyId: value })}
                        data-testid="select-company-register"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sua empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {companiesLoading ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : (
                            companies?.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="register-name">Nome Completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="Seu Nome Completo"
                          className="pl-10"
                          value={registerData.name}
                          onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                          data-testid="input-name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="register-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          data-testid="input-email"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="register-username">Usuário</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="register-username"
                          type="text"
                          placeholder="seuusuario"
                          className="pl-10"
                          value={registerData.username}
                          onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                          data-testid="input-register-username"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="register-password">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          data-testid="input-register-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          data-testid="button-toggle-register-password"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="register-role">Cargo</Label>
                      <Select
                        value={registerData.role}
                        onValueChange={(value) =>
                          setRegisterData({ ...registerData, role: value as "admin" | "corretor" | "financeiro" })
                        }
                        data-testid="select-role"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corretor">Corretor</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="financeiro">Financeiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending || !registerData.companyId}
                      data-testid="button-register"
                    >
                      {registerMutation.isPending ? "Cadastrando..." : "Cadastrar"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <Building2 className="w-24 h-24 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Gerencie seu negócio imobiliário
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            Controle completo de imóveis, clientes, contratos e finanças em uma única plataforma
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Building2 className="w-4 h-4 mr-2 text-primary" />
              Gestão de Imóveis
            </div>
            <div className="flex items-center text-muted-foreground">
              <User className="w-4 h-4 mr-2 text-primary" />
              CRM Integrado
            </div>
            <div className="flex items-center text-muted-foreground">
              <FileText className="w-4 h-4 mr-2 text-primary" />
              Contratos
            </div>
            <div className="flex items-center text-muted-foreground">
              <Phone className="w-4 h-4 mr-2 text-primary" />
              Relatórios
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
