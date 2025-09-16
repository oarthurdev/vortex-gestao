import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertPropertySchema, insertClientSchema, insertContractSchema, insertTransactionSchema } from "@shared/schema";
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

  // Contract routes
  app.get("/api/contracts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contracts = await storage.getContractsByCompany(req.user!.companyId);
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
