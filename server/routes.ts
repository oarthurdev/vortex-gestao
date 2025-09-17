import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertPropertySchema, insertClientSchema, insertContractSchema, insertTransactionSchema, insertConstructionSchema, insertConstructionTaskSchema, insertConstructionExpenseSchema, insertClientInteractionSchema, insertAppointmentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Company routes
  app.get("/api/companies", async (_req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar empresas" });
    }
  });

  // Property routes
  app.get("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const properties = await storage.getPropertiesByCompany(req.user!.companyId);
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar imóveis" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const data = insertPropertySchema.parse({
        ...req.body,
        companyId: req.user!.companyId,
      });
      const property = await storage.createProperty(data);
      
      // Create activity log
      await storage.createActivity({
        type: "property_created",
        title: "Imóvel cadastrado",
        description: `${property.title} foi cadastrado no sistema`,
        entityType: "property",
        entityId: property.id,
        userId: req.user!.id,
        companyId: req.user!.companyId,
      });
      
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar imóvel" });
    }
  });

  app.put("/api/properties/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const data = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updatePropertyWithCompanyCheck(id, data, req.user!.companyId);
      
      if (!property) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      
      res.json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar imóvel" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const deleted = await storage.deletePropertyWithCompanyCheck(id, req.user!.companyId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar imóvel" });
    }
  });

  // Client routes
  app.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const clients = await storage.getClientsByCompany(req.user!.companyId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const data = insertClientSchema.parse({
        ...req.body,
        companyId: req.user!.companyId,
      });
      const client = await storage.createClient(data);
      
      if (client.type === 'lead') {
        await storage.createActivity({
          type: "lead_created",
          title: "Novo lead cadastrado",
          description: `${client.name} foi cadastrado como lead`,
          entityType: "client",
          entityId: client.id,
          userId: req.user!.id,
          companyId: req.user!.companyId,
        });
      }
      
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar cliente" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const data = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClientWithCompanyCheck(id, data, req.user!.companyId);
      
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar cliente" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = req.params;
      const deleted = await storage.deleteClientWithCompanyCheck(id, req.user!.companyId);

      if (!deleted) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar cliente" });
    }
  });

  app.get("/api/clients/pipeline", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const summary = await storage.getClientPipelineSummary(req.user!.companyId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar o pipeline de clientes" });
    }
  });

  app.get("/api/clients/:id/interactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = req.params;
      const client = await storage.getClientWithCompanyCheck(id, req.user!.companyId);

      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      const interactions = await storage.getClientInteractions(id, req.user!.companyId);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar interações" });
    }
  });

  app.post("/api/clients/:id/interactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = req.params;
      const client = await storage.getClientWithCompanyCheck(id, req.user!.companyId);

      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      const data = insertClientInteractionSchema.parse({
        ...req.body,
        clientId: id,
        companyId: req.user!.companyId,
      });

      const interaction = await storage.createClientInteraction(data);

      await storage.createActivity({
        type: "client_interaction",
        title: `Interação registrada com ${client.name}`,
        description: data.summary,
        entityType: "client",
        entityId: client.id,
        userId: req.user!.id,
        companyId: req.user!.companyId,
      });

      res.status(201).json(interaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao registrar interação" });
    }
  });

  // Appointment routes
  app.get("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const filters: {
        status?: string;
        clientId?: string;
        upcomingOnly?: boolean;
        limit?: number;
        fromDate?: Date;
        toDate?: Date;
      } = {};

      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.clientId) filters.clientId = req.query.clientId as string;
      if (req.query.upcoming === "true") filters.upcomingOnly = true;
      if (req.query.limit) {
        const parsed = parseInt(req.query.limit as string, 10);
        if (!Number.isNaN(parsed)) filters.limit = parsed;
      }
      if (req.query.fromDate) {
        const date = new Date(req.query.fromDate as string);
        if (!Number.isNaN(date.getTime())) filters.fromDate = date;
      }
      if (req.query.toDate) {
        const date = new Date(req.query.toDate as string);
        if (!Number.isNaN(date.getTime())) filters.toDate = date;
      }

      const appointments = await storage.getAppointmentsByCompany(req.user!.companyId, filters);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar compromissos" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const normalizedBody: Record<string, unknown> = {
        ...req.body,
        companyId: req.user!.companyId,
      };

      if (normalizedBody.propertyId === "" || normalizedBody.propertyId === null) {
        delete normalizedBody.propertyId;
      }

      if (!normalizedBody.agentName) {
        normalizedBody.agentName = req.user!.name;
      }

      const data = insertAppointmentSchema.parse(normalizedBody);

      const client = await storage.getClientWithCompanyCheck(data.clientId, req.user!.companyId);
      if (!client) {
        return res.status(400).json({ message: "Cliente inválido para este compromisso" });
      }

      if (data.propertyId) {
        const property = await storage.getPropertyWithCompanyCheck(data.propertyId, req.user!.companyId);
        if (!property) {
          return res.status(400).json({ message: "Imóvel inválido para este compromisso" });
        }
      }

      const appointment = await storage.createAppointment(data);

      await storage.createActivity({
        type: "appointment_created",
        title: `Compromisso agendado com ${client.name}`,
        description: `${data.type} agendado para ${new Date(data.scheduledAt).toLocaleString('pt-BR')}`,
        entityType: "client",
        entityId: client.id,
        userId: req.user!.id,
        companyId: req.user!.companyId,
      });

      const broadcast = (req.app as any).broadcastToCompany;
      if (broadcast) {
        broadcast(req.user!.companyId, {
          type: "appointment_created",
          payload: {
            appointment,
            clientName: client.name,
          },
        });
      }

      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar compromisso" });
    }
  });

  app.put("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = req.params;
      const existing = await storage.getAppointment(id);

      if (!existing || existing.companyId !== req.user!.companyId) {
        return res.status(404).json({ message: "Compromisso não encontrado" });
      }

      const normalizedBody: Record<string, unknown> = { ...req.body };
      if (normalizedBody.propertyId === "" || normalizedBody.propertyId === null) {
        normalizedBody.propertyId = null;
      }

      if (normalizedBody.clientId) {
        const client = await storage.getClientWithCompanyCheck(normalizedBody.clientId as string, req.user!.companyId);
        if (!client) {
          return res.status(400).json({ message: "Cliente inválido para este compromisso" });
        }
      }

      const data = insertAppointmentSchema.partial().parse(normalizedBody);
      const appointment = await storage.updateAppointment(id, data);

      const broadcast = (req.app as any).broadcastToCompany;
      if (broadcast) {
        broadcast(req.user!.companyId, {
          type: "appointment_updated",
          payload: {
            appointment,
          },
        });
      }

      res.json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar compromisso" });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = req.params;
      const existing = await storage.getAppointment(id);

      if (!existing || existing.companyId !== req.user!.companyId) {
        return res.status(404).json({ message: "Compromisso não encontrado" });
      }

      const deleted = await storage.deleteAppointment(id);

      if (!deleted) {
        return res.status(500).json({ message: "Não foi possível remover o compromisso" });
      }

      const broadcast = (req.app as any).broadcastToCompany;
      if (broadcast) {
        broadcast(req.user!.companyId, {
          type: "appointment_deleted",
          payload: { id },
        });
      }

      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao remover compromisso" });
    }
  });

  // Contract routes
  app.get("/api/contracts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contracts = await storage.getContractsWithDetailsByCompany(req.user!.companyId);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar contratos" });
    }
  });

  app.post("/api/contracts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const data = insertContractSchema.parse({
        ...req.body,
        companyId: req.user!.companyId,
      });
      const contract = await storage.createContract(data);
      
      // Update property status
      if (contract.type === 'locacao') {
        await storage.updatePropertyWithCompanyCheck(contract.propertyId, { status: 'alugado' }, req.user!.companyId);
      } else if (contract.type === 'venda') {
        await storage.updatePropertyWithCompanyCheck(contract.propertyId, { status: 'vendido' }, req.user!.companyId);
      }
      
      await storage.createActivity({
        type: "contract_signed",
        title: "Novo contrato assinado",
        description: `Contrato de ${contract.type} foi assinado`,
        entityType: "contract",
        entityId: contract.id,
        userId: req.user!.id,
        companyId: req.user!.companyId,
      });
      
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar contrato" });
    }
  });

  app.put("/api/contracts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const data = insertContractSchema.partial().parse(req.body);
      const contract = await storage.updateContractWithCompanyCheck(id, data, req.user!.companyId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contrato não encontrado" });
      }
      
      res.json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar contrato" });
    }
  });

  app.delete("/api/contracts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const deleted = await storage.deleteContractWithCompanyCheck(id, req.user!.companyId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Contrato não encontrado" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar contrato" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const transactions = await storage.getTransactionsWithDetailsByCompany(req.user!.companyId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar transações" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Normalize data before validation
      const normalizedData = {
        ...req.body,
        companyId: req.user!.companyId,
      };
      
      // Handle optional contractId - convert empty string to undefined
      if (normalizedData.contractId === "" || normalizedData.contractId === null) {
        delete normalizedData.contractId;
      }
      
      // Normalize amount to string and handle comma decimal separator
      if (typeof normalizedData.amount === 'number') {
        normalizedData.amount = normalizedData.amount.toString();
      }
      if (typeof normalizedData.amount === 'string' && normalizedData.amount.includes(',')) {
        normalizedData.amount = normalizedData.amount.replace(',', '.');
      }
      
      const data = insertTransactionSchema.parse(normalizedData);
      const transaction = await storage.createTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Transaction validation errors:', error.errors); // Temporary debugging
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar transação" });
    }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      
      // Normalize data before validation
      const normalizedData = { ...req.body };
      
      // Handle optional contractId - convert empty string to undefined
      if (normalizedData.contractId === "" || normalizedData.contractId === null) {
        delete normalizedData.contractId;
      }
      
      // Normalize amount to string and handle comma decimal separator
      if (typeof normalizedData.amount === 'number') {
        normalizedData.amount = normalizedData.amount.toString();
      }
      if (typeof normalizedData.amount === 'string' && normalizedData.amount.includes(',')) {
        normalizedData.amount = normalizedData.amount.replace(',', '.');
      }
      
      const data = insertTransactionSchema.partial().parse(normalizedData);
      const transaction = await storage.updateTransactionWithCompanyCheck(id, data, req.user!.companyId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transação não encontrada" });
      }
      
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Transaction update validation errors:', error.errors); // Temporary debugging
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar transação" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTransactionWithCompanyCheck(id, req.user!.companyId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Transação não encontrada" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar transação" });
    }
  });

  // Activity routes
  app.get("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getActivitiesByCompany(req.user!.companyId, limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar atividades" });
    }
  });

  // Dashboard KPIs
  app.get("/api/kpis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const kpis = await storage.getKPIsByCompany(req.user!.companyId);
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar KPIs" });
    }
  });

  // Construction routes
  app.get("/api/constructions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const constructions = await storage.getConstructionsWithDetailsByCompany(req.user!.companyId);
      res.json(constructions);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar construções" });
    }
  });

  app.get("/api/constructions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const construction = await storage.getConstructionWithCompanyCheck(id, req.user!.companyId);
      
      if (!construction) {
        return res.status(404).json({ message: "Construção não encontrada" });
      }
      
      res.json(construction);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar construção" });
    }
  });

  app.post("/api/constructions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const data = insertConstructionSchema.parse({
        ...req.body,
        companyId: req.user!.companyId,
      });
      const construction = await storage.createConstruction(data);
      
      // Create activity log
      await storage.createActivity({
        type: "construction_created",
        title: "Nova construção criada",
        description: `${construction.name} foi criada no sistema`,
        entityType: "construction",
        entityId: construction.id,
        userId: req.user!.id,
        companyId: req.user!.companyId,
      });
      
      res.status(201).json(construction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar construção" });
    }
  });

  app.put("/api/constructions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const data = insertConstructionSchema.partial().parse(req.body);
      const construction = await storage.updateConstructionWithCompanyCheck(id, data, req.user!.companyId);
      
      if (!construction) {
        return res.status(404).json({ message: "Construção não encontrada" });
      }
      
      res.json(construction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar construção" });
    }
  });

  app.delete("/api/constructions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const deleted = await storage.deleteConstructionWithCompanyCheck(id, req.user!.companyId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Construção não encontrada" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar construção" });
    }
  });

  // Construction Tasks routes
  app.get("/api/constructions/:constructionId/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { constructionId } = req.params;
      
      // Verify construction belongs to user's company
      const construction = await storage.getConstructionWithCompanyCheck(constructionId, req.user!.companyId);
      if (!construction) {
        return res.status(404).json({ message: "Construção não encontrada" });
      }
      
      const tasks = await storage.getConstructionTasksByConstruction(constructionId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar tarefas" });
    }
  });

  app.post("/api/constructions/:constructionId/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { constructionId } = req.params;
      
      // Verify construction belongs to user's company
      const construction = await storage.getConstructionWithCompanyCheck(constructionId, req.user!.companyId);
      if (!construction) {
        return res.status(404).json({ message: "Construção não encontrada" });
      }
      
      const data = insertConstructionTaskSchema.parse({
        ...req.body,
        constructionId,
        companyId: req.user!.companyId,
      });
      const task = await storage.createConstructionTask(data);
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar tarefa" });
    }
  });

  app.put("/api/construction-tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      
      // Verify task exists and belongs to user's company construction
      const existingTask = await storage.getConstructionTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }
      
      const construction = await storage.getConstructionWithCompanyCheck(existingTask.constructionId, req.user!.companyId);
      if (!construction) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }
      
      const data = insertConstructionTaskSchema.partial().parse(req.body);
      const task = await storage.updateConstructionTask(id, data);
      
      if (!task) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }
      
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar tarefa" });
    }
  });

  app.delete("/api/construction-tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      
      // Verify task exists and belongs to user's company construction
      const existingTask = await storage.getConstructionTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }
      
      const construction = await storage.getConstructionWithCompanyCheck(existingTask.constructionId, req.user!.companyId);
      if (!construction) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }
      
      const deleted = await storage.deleteConstructionTask(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar tarefa" });
    }
  });

  // Construction Expenses routes
  app.get("/api/constructions/:constructionId/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { constructionId } = req.params;
      
      // Verify construction belongs to user's company
      const construction = await storage.getConstructionWithCompanyCheck(constructionId, req.user!.companyId);
      if (!construction) {
        return res.status(404).json({ message: "Construção não encontrada" });
      }
      
      const expenses = await storage.getConstructionExpensesByConstruction(constructionId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar despesas" });
    }
  });

  app.post("/api/constructions/:constructionId/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { constructionId } = req.params;
      
      // Verify construction belongs to user's company
      const construction = await storage.getConstructionWithCompanyCheck(constructionId, req.user!.companyId);
      if (!construction) {
        return res.status(404).json({ message: "Construção não encontrada" });
      }
      
      // Normalize data before validation
      const normalizedData = {
        ...req.body,
        constructionId,
        companyId: req.user!.companyId,
      };
      
      // Handle optional taskId - convert empty string to undefined
      if (normalizedData.taskId === "" || normalizedData.taskId === null) {
        delete normalizedData.taskId;
      }
      
      // Normalize amount to string and handle comma decimal separator
      if (typeof normalizedData.amount === 'number') {
        normalizedData.amount = normalizedData.amount.toString();
      }
      if (typeof normalizedData.amount === 'string' && normalizedData.amount.includes(',')) {
        normalizedData.amount = normalizedData.amount.replace(',', '.');
      }
      
      const data = insertConstructionExpenseSchema.parse(normalizedData);
      const expense = await storage.createConstructionExpense(data);
      
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar despesa" });
    }
  });

  app.put("/api/construction-expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      
      // Verify expense exists and belongs to user's company construction
      const existingExpense = await storage.getConstructionExpense(id);
      if (!existingExpense) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      const construction = await storage.getConstructionWithCompanyCheck(existingExpense.constructionId, req.user!.companyId);
      if (!construction) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      // Normalize data before validation
      const normalizedData = { ...req.body };
      
      // Handle optional taskId - convert empty string to undefined
      if (normalizedData.taskId === "" || normalizedData.taskId === null) {
        delete normalizedData.taskId;
      }
      
      // Normalize amount to string and handle comma decimal separator
      if (typeof normalizedData.amount === 'number') {
        normalizedData.amount = normalizedData.amount.toString();
      }
      if (typeof normalizedData.amount === 'string' && normalizedData.amount.includes(',')) {
        normalizedData.amount = normalizedData.amount.replace(',', '.');
      }
      
      const data = insertConstructionExpenseSchema.partial().parse(normalizedData);
      const expense = await storage.updateConstructionExpense(id, data);
      
      if (!expense) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar despesa" });
    }
  });

  app.delete("/api/construction-expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      
      // Verify expense exists and belongs to user's company construction
      const existingExpense = await storage.getConstructionExpense(id);
      if (!existingExpense) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      const construction = await storage.getConstructionWithCompanyCheck(existingExpense.constructionId, req.user!.companyId);
      if (!construction) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      const deleted = await storage.deleteConstructionExpense(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar despesa" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'join_company') {
          // Store company ID with the WebSocket connection
          (ws as any).companyId = data.companyId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Function to broadcast to all clients of a company
  const broadcastToCompany = (companyId: string, message: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && (client as any).companyId === companyId) {
        client.send(JSON.stringify(message));
      }
    });
  };

  // Store broadcast function for use in other modules
  (app as any).broadcastToCompany = broadcastToCompany;

  return httpServer;
}
