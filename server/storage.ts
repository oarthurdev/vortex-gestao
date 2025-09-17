import { type User, type InsertUser, type Company, type InsertCompany, type Property, type InsertProperty, type Client, type InsertClient, type Contract, type InsertContract, type Transaction, type InsertTransaction, type Activity, type InsertActivity, type ContractWithDetails, type TransactionWithDetails, type Construction, type InsertConstruction, type ConstructionTask, type InsertConstructionTask, type ConstructionExpense, type InsertConstructionExpense, type ConstructionWithDetails, type ClientInteraction, type InsertClientInteraction, type Appointment, type InsertAppointment, type ClientPipelineSummary } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db } from "./db";
import { companies, users, properties, clients, contracts, transactions, activities, constructions, constructionTasks, constructionExpenses, clientInteractions, appointments } from "@shared/schema";
import { eq, and, desc, sql, count, sum, gte, lte } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

const PIPELINE_STAGES = [
  { stage: "novo", label: "Novos Leads" },
  { stage: "qualificado", label: "Qualificados" },
  { stage: "visita_agendada", label: "Visitas agendadas" },
  { stage: "proposta", label: "Propostas" },
  { stage: "fechado", label: "Fechados" },
  { stage: "perdido", label: "Perdidos" },
];

function parsePipelineValue(value: Client["pipelineValue"]): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildPipelineSummary(clients: Client[]): ClientPipelineSummary {
  const stages = PIPELINE_STAGES.map(({ stage, label }) => {
    const stageClients = clients.filter(client => client.stage === stage);
    const totalValue = stageClients.reduce((sum, client) => sum + parsePipelineValue(client.pipelineValue), 0);

    return {
      stage,
      label,
      count: stageClients.length,
      totalValue,
    };
  });

  const totalLeadCount = clients.filter(client => client.type === "lead" || client.type === "comprador").length;
  const closedCount = clients.filter(client => client.stage === "fechado").length;
  const conversionRate = totalLeadCount > 0 ? (closedCount / totalLeadCount) * 100 : 0;

  const upcomingFollowUps = clients
    .filter(client => client.nextFollowUp && client.nextFollowUp.getTime() > Date.now())
    .sort((a, b) => (a.nextFollowUp?.getTime() || 0) - (b.nextFollowUp?.getTime() || 0))
    .slice(0, 5)
    .map(client => ({
      clientId: client.id,
      name: client.name,
      stage: client.stage,
      nextFollowUp: client.nextFollowUp!,
    }));

  return {
    stages,
    conversionRate,
    upcomingFollowUps,
  };
}

export interface IStorage {
  sessionStore: session.Store;
  
  // Company methods
  getCompany(id: string): Promise<Company | undefined>;
  getCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Property methods
  getProperty(id: string): Promise<Property | undefined>;
  getPropertyWithCompanyCheck(id: string, companyId: string): Promise<Property | undefined>;
  getPropertiesByCompany(companyId: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  updatePropertyWithCompanyCheck(id: string, property: Partial<InsertProperty>, companyId: string): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;
  deletePropertyWithCompanyCheck(id: string, companyId: string): Promise<boolean>;
  
  // Client methods
  getClient(id: string): Promise<Client | undefined>;
  getClientWithCompanyCheck(id: string, companyId: string): Promise<Client | undefined>;
  getClientsByCompany(companyId: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  updateClientWithCompanyCheck(id: string, client: Partial<InsertClient>, companyId: string): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  deleteClientWithCompanyCheck(id: string, companyId: string): Promise<boolean>;
  getClientPipelineSummary(companyId: string): Promise<ClientPipelineSummary>;
  getClientInteractions(clientId: string, companyId: string): Promise<ClientInteraction[]>;
  createClientInteraction(interaction: InsertClientInteraction): Promise<ClientInteraction>;

  // Contract methods
  getContract(id: string): Promise<Contract | undefined>;
  getContractWithCompanyCheck(id: string, companyId: string): Promise<Contract | undefined>;
  getContractsByCompany(companyId: string): Promise<Contract[]>;
  getContractsWithDetailsByCompany(companyId: string): Promise<ContractWithDetails[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  updateContractWithCompanyCheck(id: string, contract: Partial<InsertContract>, companyId: string): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<boolean>;
  deleteContractWithCompanyCheck(id: string, companyId: string): Promise<boolean>;
  
  // Transaction methods
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionWithCompanyCheck(id: string, companyId: string): Promise<Transaction | undefined>;
  getTransactionsByCompany(companyId: string): Promise<Transaction[]>;
  getTransactionsWithDetailsByCompany(companyId: string): Promise<TransactionWithDetails[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  updateTransactionWithCompanyCheck(id: string, transaction: Partial<InsertTransaction>, companyId: string): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;
  deleteTransactionWithCompanyCheck(id: string, companyId: string): Promise<boolean>;
  
  // Activity methods
  getActivitiesByCompany(companyId: string, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Construction methods
  getConstruction(id: string): Promise<Construction | undefined>;
  getConstructionWithCompanyCheck(id: string, companyId: string): Promise<Construction | undefined>;
  getConstructionsByCompany(companyId: string): Promise<Construction[]>;
  getConstructionsWithDetailsByCompany(companyId: string): Promise<ConstructionWithDetails[]>;
  createConstruction(construction: InsertConstruction): Promise<Construction>;
  updateConstruction(id: string, construction: Partial<InsertConstruction>): Promise<Construction | undefined>;
  updateConstructionWithCompanyCheck(id: string, construction: Partial<InsertConstruction>, companyId: string): Promise<Construction | undefined>;
  deleteConstruction(id: string): Promise<boolean>;
  deleteConstructionWithCompanyCheck(id: string, companyId: string): Promise<boolean>;
  
  // Construction Task methods
  getConstructionTask(id: string): Promise<ConstructionTask | undefined>;
  getConstructionTasksByConstruction(constructionId: string): Promise<ConstructionTask[]>;
  createConstructionTask(task: InsertConstructionTask): Promise<ConstructionTask>;
  updateConstructionTask(id: string, task: Partial<InsertConstructionTask>): Promise<ConstructionTask | undefined>;
  deleteConstructionTask(id: string): Promise<boolean>;
  
  // Construction Expense methods
  getConstructionExpense(id: string): Promise<ConstructionExpense | undefined>;
  getConstructionExpensesByConstruction(constructionId: string): Promise<ConstructionExpense[]>;
  createConstructionExpense(expense: InsertConstructionExpense): Promise<ConstructionExpense>;
  updateConstructionExpense(id: string, expense: Partial<InsertConstructionExpense>): Promise<ConstructionExpense | undefined>;
  deleteConstructionExpense(id: string): Promise<boolean>;

  // Appointment methods
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByCompany(
    companyId: string,
    filters?: {
      status?: string;
      clientId?: string;
      upcomingOnly?: boolean;
      limit?: number;
      fromDate?: Date;
      toDate?: Date;
    },
  ): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;

  // Dashboard methods
  getKPIsByCompany(companyId: string): Promise<{
    activeProperties: number;
    monthlyRevenue: string;
    activeContracts: number;
    monthlyLeads: number;
  }>;
}

export class MemStorage implements IStorage {
  private companies: Map<string, Company>;
  private users: Map<string, User>;
  private properties: Map<string, Property>;
  private clients: Map<string, Client>;
  private contracts: Map<string, Contract>;
  private transactions: Map<string, Transaction>;
  private activities: Map<string, Activity>;
  private constructions: Map<string, Construction>;
  private constructionTasks: Map<string, ConstructionTask>;
  private constructionExpenses: Map<string, ConstructionExpense>;
  private clientInteractions: Map<string, ClientInteraction>;
  private appointments: Map<string, Appointment>;
  public sessionStore: session.Store;

  constructor() {
    this.companies = new Map();
    this.users = new Map();
    this.properties = new Map();
    this.clients = new Map();
    this.contracts = new Map();
    this.transactions = new Map();
    this.activities = new Map();
    this.constructions = new Map();
    this.constructionTasks = new Map();
    this.constructionExpenses = new Map();
    this.clientInteractions = new Map();
    this.appointments = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // Company methods
  async getCompany(id: string): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = randomUUID();
    const company: Company = {
      ...insertCompany,
      id,
      phone: insertCompany.phone ?? null,
      address: insertCompany.address ?? null,
      createdAt: new Date(),
    };
    this.companies.set(id, company);
    return company;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.companyId === companyId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role ?? "corretor",
      isActive: insertUser.isActive ?? true,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Property methods
  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getPropertyWithCompanyCheck(id: string, companyId: string): Promise<Property | undefined> {
    const property = this.properties.get(id);
    return property && property.companyId === companyId ? property : undefined;
  }

  async getPropertiesByCompany(companyId: string): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      (property) => property.companyId === companyId,
    );
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const now = new Date();
    const property: Property = {
      ...insertProperty,
      id,
      status: insertProperty.status ?? "disponivel",
      description: insertProperty.description ?? null,
      area: insertProperty.area ?? null,
      bedrooms: insertProperty.bedrooms ?? null,
      bathrooms: insertProperty.bathrooms ?? null,
      parkingSpaces: insertProperty.parkingSpaces ?? null,
      images: insertProperty.images ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.properties.set(id, property);
    return property;
  }

  async updateProperty(id: string, propertyData: Partial<InsertProperty>): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;
    
    const updatedProperty = { ...property, ...propertyData, updatedAt: new Date() };
    this.properties.set(id, updatedProperty);
    return updatedProperty;
  }

  async updatePropertyWithCompanyCheck(id: string, propertyData: Partial<InsertProperty>, companyId: string): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property || property.companyId !== companyId) return undefined;
    
    const updatedProperty = { ...property, ...propertyData, updatedAt: new Date() };
    this.properties.set(id, updatedProperty);
    return updatedProperty;
  }

  async deleteProperty(id: string): Promise<boolean> {
    return this.properties.delete(id);
  }

  async deletePropertyWithCompanyCheck(id: string, companyId: string): Promise<boolean> {
    const property = this.properties.get(id);
    if (!property || property.companyId !== companyId) return false;
    return this.properties.delete(id);
  }

  // Client methods
  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientWithCompanyCheck(id: string, companyId: string): Promise<Client | undefined> {
    const client = this.clients.get(id);
    return client && client.companyId === companyId ? client : undefined;
  }

  async getClientsByCompany(companyId: string): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.companyId === companyId,
    );
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const now = new Date();
    const normalizedPipelineValue = insertClient.pipelineValue
      ? typeof insertClient.pipelineValue === "number"
        ? insertClient.pipelineValue.toString()
        : insertClient.pipelineValue
      : null;
    const client: Client = {
      ...insertClient,
      id,
      document: insertClient.document ?? null,
      address: insertClient.address ?? null,
      notes: insertClient.notes ?? null,
      stage: insertClient.stage ?? "novo",
      source: insertClient.source ?? null,
      tags: insertClient.tags ?? [],
      pipelineValue: normalizedPipelineValue,
      lastContactAt: insertClient.lastContactAt ?? null,
      nextFollowUp: insertClient.nextFollowUp ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const normalizedPipelineValue = clientData.pipelineValue
      ? typeof clientData.pipelineValue === "number"
        ? clientData.pipelineValue.toString()
        : clientData.pipelineValue
      : client.pipelineValue;

    const updatedClient = {
      ...client,
      ...clientData,
      pipelineValue: normalizedPipelineValue,
      tags: clientData.tags ?? client.tags ?? [],
      updatedAt: new Date(),
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async updateClientWithCompanyCheck(id: string, clientData: Partial<InsertClient>, companyId: string): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client || client.companyId !== companyId) return undefined;

    const normalizedPipelineValue = clientData.pipelineValue
      ? typeof clientData.pipelineValue === "number"
        ? clientData.pipelineValue.toString()
        : clientData.pipelineValue
      : client.pipelineValue;

    const updatedClient = {
      ...client,
      ...clientData,
      pipelineValue: normalizedPipelineValue,
      tags: clientData.tags ?? client.tags ?? [],
      updatedAt: new Date(),
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
  }

  async deleteClientWithCompanyCheck(id: string, companyId: string): Promise<boolean> {
    const client = this.clients.get(id);
    if (!client || client.companyId !== companyId) return false;
    return this.clients.delete(id);
  }

  async getClientPipelineSummary(companyId: string): Promise<ClientPipelineSummary> {
    const clients = await this.getClientsByCompany(companyId);
    return buildPipelineSummary(clients);
  }

  async getClientInteractions(clientId: string, companyId: string): Promise<ClientInteraction[]> {
    return Array.from(this.clientInteractions.values())
      .filter(interaction => interaction.clientId === clientId && interaction.companyId === companyId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  async createClientInteraction(insertInteraction: InsertClientInteraction): Promise<ClientInteraction> {
    const id = randomUUID();
    const interaction: ClientInteraction = {
      ...insertInteraction,
      id,
      channel: insertInteraction.channel ?? null,
      nextSteps: insertInteraction.nextSteps ?? null,
      nextFollowUp: insertInteraction.nextFollowUp ?? null,
      stage: insertInteraction.stage ?? null,
      createdBy: insertInteraction.createdBy ?? null,
      createdAt: new Date(),
    };

    this.clientInteractions.set(id, interaction);

    const client = this.clients.get(interaction.clientId);
    if (client) {
      const updatedClient: Client = {
        ...client,
        stage: interaction.stage ?? client.stage,
        lastContactAt: interaction.occurredAt,
        nextFollowUp: interaction.nextFollowUp ?? client.nextFollowUp ?? null,
        updatedAt: new Date(),
      };
      this.clients.set(client.id, updatedClient);
    }

    return interaction;
  }

  // Contract methods
  async getContract(id: string): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }

  async getContractWithCompanyCheck(id: string, companyId: string): Promise<Contract | undefined> {
    const contract = this.contracts.get(id);
    return contract && contract.companyId === companyId ? contract : undefined;
  }

  async getContractsByCompany(companyId: string): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      (contract) => contract.companyId === companyId,
    );
  }

  async getContractsWithDetailsByCompany(companyId: string): Promise<ContractWithDetails[]> {
    const contracts = Array.from(this.contracts.values()).filter(
      (contract) => contract.companyId === companyId,
    );
    
    return contracts.map(contract => {
      const property = this.properties.get(contract.propertyId);
      const client = this.clients.get(contract.clientId);
      
      return {
        ...contract,
        property: {
          id: property!.id,
          title: property!.title,
          address: property!.address,
        },
        client: {
          id: client!.id,
          name: client!.name,
          email: client!.email,
        },
      };
    });
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    const id = randomUUID();
    const now = new Date();
    const contract: Contract = {
      ...insertContract,
      id,
      status: insertContract.status ?? "ativo",
      endDate: insertContract.endDate ?? null,
      terms: insertContract.terms ?? null,
      commission: insertContract.commission ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.contracts.set(id, contract);
    return contract;
  }

  async updateContract(id: string, contractData: Partial<InsertContract>): Promise<Contract | undefined> {
    const contract = this.contracts.get(id);
    if (!contract) return undefined;
    
    const updatedContract = { ...contract, ...contractData, updatedAt: new Date() };
    this.contracts.set(id, updatedContract);
    return updatedContract;
  }

  async updateContractWithCompanyCheck(id: string, contractData: Partial<InsertContract>, companyId: string): Promise<Contract | undefined> {
    const contract = this.contracts.get(id);
    if (!contract || contract.companyId !== companyId) return undefined;
    
    const updatedContract = { ...contract, ...contractData, updatedAt: new Date() };
    this.contracts.set(id, updatedContract);
    return updatedContract;
  }

  async deleteContract(id: string): Promise<boolean> {
    return this.contracts.delete(id);
  }

  async deleteContractWithCompanyCheck(id: string, companyId: string): Promise<boolean> {
    const contract = this.contracts.get(id);
    if (!contract || contract.companyId !== companyId) return false;
    return this.contracts.delete(id);
  }

  // Transaction methods
  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionWithCompanyCheck(id: string, companyId: string): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    return transaction && transaction.companyId === companyId ? transaction : undefined;
  }

  async getTransactionsByCompany(companyId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.companyId === companyId,
    );
  }

  async getTransactionsWithDetailsByCompany(companyId: string): Promise<TransactionWithDetails[]> {
    const transactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.companyId === companyId,
    );
    
    return transactions.map(transaction => {
      const transactionWithDetails: TransactionWithDetails = { ...transaction };
      
      if (transaction.contractId) {
        const contract = this.contracts.get(transaction.contractId);
        if (contract) {
          const property = this.properties.get(contract.propertyId);
          const client = this.clients.get(contract.clientId);
          
          if (property && client) {
            transactionWithDetails.contract = {
              id: contract.id,
              type: contract.type,
              property: {
                id: property.id,
                title: property.title,
              },
              client: {
                id: client.id,
                name: client.name,
              },
            };
          }
        }
      }
      
      return transactionWithDetails;
    });
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      status: insertTransaction.status ?? "pendente",
      paidDate: insertTransaction.paidDate ?? null,
      contractId: insertTransaction.contractId ?? null,
      createdAt: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: string, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...transactionData };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async updateTransactionWithCompanyCheck(id: string, transactionData: Partial<InsertTransaction>, companyId: string): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction || transaction.companyId !== companyId) return undefined;
    
    const updatedTransaction = { ...transaction, ...transactionData };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    return this.transactions.delete(id);
  }

  async deleteTransactionWithCompanyCheck(id: string, companyId: string): Promise<boolean> {
    const transaction = this.transactions.get(id);
    if (!transaction || transaction.companyId !== companyId) return false;
    return this.transactions.delete(id);
  }

  // Activity methods
  async getActivitiesByCompany(companyId: string, limit = 10): Promise<Activity[]> {
    const activities = Array.from(this.activities.values())
      .filter((activity) => activity.companyId === companyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return activities;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = {
      ...insertActivity,
      id,
      description: insertActivity.description ?? null,
      entityType: insertActivity.entityType ?? null,
      entityId: insertActivity.entityId ?? null,
      userId: insertActivity.userId ?? null,
      createdAt: new Date(),
    };
    this.activities.set(id, activity);
    return activity;
  }

  // Construction methods
  async getConstruction(id: string): Promise<Construction | undefined> {
    return this.constructions.get(id);
  }

  async getConstructionWithCompanyCheck(id: string, companyId: string): Promise<Construction | undefined> {
    const construction = this.constructions.get(id);
    return construction && construction.companyId === companyId ? construction : undefined;
  }

  async getConstructionsByCompany(companyId: string): Promise<Construction[]> {
    return Array.from(this.constructions.values()).filter(
      (construction) => construction.companyId === companyId,
    );
  }

  async getConstructionsWithDetailsByCompany(companyId: string): Promise<ConstructionWithDetails[]> {
    const constructions = Array.from(this.constructions.values()).filter(
      (construction) => construction.companyId === companyId,
    );
    
    return constructions.map(construction => {
      const property = this.properties.get(construction.propertyId);
      
      return {
        ...construction,
        property: {
          id: property!.id,
          title: property!.title,
          address: property!.address,
        },
      };
    });
  }

  async createConstruction(insertConstruction: InsertConstruction): Promise<Construction> {
    const id = randomUUID();
    const now = new Date();
    const construction: Construction = {
      ...insertConstruction,
      id,
      status: insertConstruction.status ?? "planejamento",
      description: insertConstruction.description ?? null,
      budget: insertConstruction.budget ?? null,
      spent: insertConstruction.spent ?? "0",
      startDate: insertConstruction.startDate ?? null,
      endDate: insertConstruction.endDate ?? null,
      expectedEndDate: insertConstruction.expectedEndDate ?? null,
      progress: insertConstruction.progress ?? 0,
      contractor: insertConstruction.contractor ?? null,
      contractorContact: insertConstruction.contractorContact ?? null,
      notes: insertConstruction.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.constructions.set(id, construction);
    return construction;
  }

  async updateConstruction(id: string, constructionData: Partial<InsertConstruction>): Promise<Construction | undefined> {
    const construction = this.constructions.get(id);
    if (!construction) return undefined;
    
    const updatedConstruction = { ...construction, ...constructionData, updatedAt: new Date() };
    this.constructions.set(id, updatedConstruction);
    return updatedConstruction;
  }

  async updateConstructionWithCompanyCheck(id: string, constructionData: Partial<InsertConstruction>, companyId: string): Promise<Construction | undefined> {
    const construction = this.constructions.get(id);
    if (!construction || construction.companyId !== companyId) return undefined;
    
    const updatedConstruction = { ...construction, ...constructionData, updatedAt: new Date() };
    this.constructions.set(id, updatedConstruction);
    return updatedConstruction;
  }

  async deleteConstruction(id: string): Promise<boolean> {
    return this.constructions.delete(id);
  }

  async deleteConstructionWithCompanyCheck(id: string, companyId: string): Promise<boolean> {
    const construction = this.constructions.get(id);
    if (!construction || construction.companyId !== companyId) return false;
    return this.constructions.delete(id);
  }

  // Construction Task methods
  async getConstructionTask(id: string): Promise<ConstructionTask | undefined> {
    return this.constructionTasks.get(id);
  }

  async getConstructionTasksByConstruction(constructionId: string): Promise<ConstructionTask[]> {
    return Array.from(this.constructionTasks.values())
      .filter((task) => task.constructionId === constructionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createConstructionTask(insertTask: InsertConstructionTask): Promise<ConstructionTask> {
    const id = randomUUID();
    const now = new Date();
    const task: ConstructionTask = {
      ...insertTask,
      id,
      description: insertTask.description ?? null,
      status: insertTask.status ?? "pendente",
      priority: insertTask.priority ?? "media",
      startDate: insertTask.startDate ?? null,
      endDate: insertTask.endDate ?? null,
      assignedTo: insertTask.assignedTo ?? null,
      estimatedCost: insertTask.estimatedCost ?? null,
      actualCost: insertTask.actualCost ?? null,
      progress: insertTask.progress ?? 0,
      order: insertTask.order ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    this.constructionTasks.set(id, task);
    return task;
  }

  async updateConstructionTask(id: string, taskData: Partial<InsertConstructionTask>): Promise<ConstructionTask | undefined> {
    const task = this.constructionTasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...taskData, updatedAt: new Date() };
    this.constructionTasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteConstructionTask(id: string): Promise<boolean> {
    return this.constructionTasks.delete(id);
  }

  // Construction Expense methods
  async getConstructionExpense(id: string): Promise<ConstructionExpense | undefined> {
    return this.constructionExpenses.get(id);
  }

  async getConstructionExpensesByConstruction(constructionId: string): Promise<ConstructionExpense[]> {
    return Array.from(this.constructionExpenses.values())
      .filter((expense) => expense.constructionId === constructionId)
      .sort((a, b) => b.expenseDate.getTime() - a.expenseDate.getTime());
  }

  async createConstructionExpense(insertExpense: InsertConstructionExpense): Promise<ConstructionExpense> {
    const id = randomUUID();
    const expense: ConstructionExpense = {
      ...insertExpense,
      id,
      taskId: insertExpense.taskId ?? null,
      supplier: insertExpense.supplier ?? null,
      receipt: insertExpense.receipt ?? null,
      notes: insertExpense.notes ?? null,
      createdAt: new Date(),
    };
    this.constructionExpenses.set(id, expense);
    return expense;
  }

  async updateConstructionExpense(id: string, expenseData: Partial<InsertConstructionExpense>): Promise<ConstructionExpense | undefined> {
    const expense = this.constructionExpenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...expenseData };
    this.constructionExpenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteConstructionExpense(id: string): Promise<boolean> {
    return this.constructionExpenses.delete(id);
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentsByCompany(
    companyId: string,
    filters: {
      status?: string;
      clientId?: string;
      upcomingOnly?: boolean;
      limit?: number;
      fromDate?: Date;
      toDate?: Date;
    } = {},
  ): Promise<Appointment[]> {
    const now = new Date();
    let appointments = Array.from(this.appointments.values()).filter(
      appointment => appointment.companyId === companyId,
    );

    if (filters.status) {
      appointments = appointments.filter(appointment => appointment.status === filters.status);
    }

    if (filters.clientId) {
      appointments = appointments.filter(appointment => appointment.clientId === filters.clientId);
    }

    if (filters.upcomingOnly) {
      appointments = appointments.filter(appointment => appointment.scheduledAt >= now);
    }

    if (filters.fromDate) {
      appointments = appointments.filter(appointment => appointment.scheduledAt >= filters.fromDate!);
    }

    if (filters.toDate) {
      appointments = appointments.filter(appointment => appointment.scheduledAt <= filters.toDate!);
    }

    appointments.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    if (filters.limit) {
      appointments = appointments.slice(0, filters.limit);
    }

    return appointments;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const now = new Date();
    const appointment: Appointment = {
      ...insertAppointment,
      id,
      propertyId: insertAppointment.propertyId ?? null,
      status: insertAppointment.status ?? "agendado",
      type: insertAppointment.type ?? "visita",
      durationMinutes: insertAppointment.durationMinutes ?? 60,
      notes: insertAppointment.notes ?? null,
      agentName: insertAppointment.agentName ?? null,
      channel: insertAppointment.channel ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.appointments.set(id, appointment);

    const client = this.clients.get(appointment.clientId);
    if (client) {
      const updatedClient: Client = {
        ...client,
        stage: appointment.status === "cancelado" ? client.stage : client.stage === "novo" ? "visita_agendada" : client.stage,
        nextFollowUp: appointment.scheduledAt,
        updatedAt: new Date(),
      };

      if (appointment.status === "realizado") {
        updatedClient.stage = "fechado";
      }

      this.clients.set(client.id, updatedClient);
    }

    return appointment;
  }

  async updateAppointment(id: string, appointmentData: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;

    const updatedAppointment: Appointment = {
      ...appointment,
      ...appointmentData,
      propertyId: appointmentData.propertyId ?? appointment.propertyId ?? null,
      notes: appointmentData.notes ?? appointment.notes ?? null,
      agentName: appointmentData.agentName ?? appointment.agentName ?? null,
      channel: appointmentData.channel ?? appointment.channel ?? null,
      status: appointmentData.status ?? appointment.status,
      type: appointmentData.type ?? appointment.type,
      durationMinutes: appointmentData.durationMinutes ?? appointment.durationMinutes,
      scheduledAt: appointmentData.scheduledAt ?? appointment.scheduledAt,
      updatedAt: new Date(),
    };

    this.appointments.set(id, updatedAppointment);

    const client = this.clients.get(updatedAppointment.clientId);
    if (client) {
      const updates: Partial<Client> = {
        nextFollowUp: updatedAppointment.scheduledAt,
      };

      if (appointmentData.status === "realizado") {
        updates.stage = "fechado";
      } else if (appointmentData.status === "cancelado" && client.stage === "visita_agendada") {
        updates.stage = "qualificado";
      }

      const updatedClient: Client = {
        ...client,
        ...updates,
        updatedAt: new Date(),
      };

      this.clients.set(client.id, updatedClient);
    }

    return updatedAppointment;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    return this.appointments.delete(id);
  }

  // Dashboard methods
  async getKPIsByCompany(companyId: string): Promise<{
    activeProperties: number;
    monthlyRevenue: string;
    activeContracts: number;
    monthlyLeads: number;
  }> {
    const properties = await this.getPropertiesByCompany(companyId);
    const contracts = await this.getContractsByCompany(companyId);
    const clients = await this.getClientsByCompany(companyId);
    const transactions = await this.getTransactionsByCompany(companyId);

    const activeProperties = properties.filter(p => p.status === 'disponivel' || p.status === 'alugado').length;
    const activeContracts = contracts.filter(c => c.status === 'ativo').length;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyLeads = clients.filter(c => 
      c.type === 'lead' && 
      c.createdAt.getMonth() === currentMonth && 
      c.createdAt.getFullYear() === currentYear
    ).length;

    const monthlyRevenue = transactions
      .filter(t => 
        t.type === 'receita' && 
        t.status === 'pago' &&
        t.paidDate &&
        t.paidDate.getMonth() === currentMonth && 
        t.paidDate.getFullYear() === currentYear
      )
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
      activeProperties,
      monthlyRevenue: `R$ ${(monthlyRevenue / 1000).toFixed(1)}K`,
      activeContracts,
      monthlyLeads,
    };
  }
}

export class DbStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // Company methods
  async getCompany(id: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return result[0];
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const result = await db.insert(companies).values(insertCompany).returning();
    return result[0];
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Property methods
  async getProperty(id: string): Promise<Property | undefined> {
    const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0];
  }

  async getPropertyWithCompanyCheck(id: string, companyId: string): Promise<Property | undefined> {
    const result = await db.select().from(properties)
      .where(and(eq(properties.id, id), eq(properties.companyId, companyId)))
      .limit(1);
    return result[0];
  }

  async getPropertiesByCompany(companyId: string): Promise<Property[]> {
    return await db.select().from(properties).where(eq(properties.companyId, companyId));
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const result = await db.insert(properties).values(insertProperty).returning();
    return result[0];
  }

  async updateProperty(id: string, propertyData: Partial<InsertProperty>): Promise<Property | undefined> {
    const result = await db.update(properties)
      .set({ ...propertyData, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return result[0];
  }

  async updatePropertyWithCompanyCheck(id: string, propertyData: Partial<InsertProperty>, companyId: string): Promise<Property | undefined> {
    const result = await db.update(properties)
      .set({ ...propertyData, updatedAt: new Date() })
      .where(and(eq(properties.id, id), eq(properties.companyId, companyId)))
      .returning();
    return result[0];
  }

  async deleteProperty(id: string): Promise<boolean> {
    const result = await db.delete(properties).where(eq(properties.id, id)).returning();
    return result.length > 0;
  }

  async deletePropertyWithCompanyCheck(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(properties)
      .where(and(eq(properties.id, id), eq(properties.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  // Client methods
  async getClient(id: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async getClientWithCompanyCheck(id: string, companyId: string): Promise<Client | undefined> {
    const result = await db.select().from(clients)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
      .limit(1);
    return result[0];
  }

  async getClientsByCompany(companyId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.companyId, companyId));
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const normalizedPipelineValue =
      insertClient.pipelineValue !== undefined && insertClient.pipelineValue !== null
        ? typeof insertClient.pipelineValue === "number"
          ? insertClient.pipelineValue.toString()
          : insertClient.pipelineValue
        : null;

    const values = {
      ...insertClient,
      stage: insertClient.stage ?? "novo",
      source: insertClient.source ?? null,
      tags: insertClient.tags ?? [],
      pipelineValue: normalizedPipelineValue,
      lastContactAt: insertClient.lastContactAt ?? null,
      nextFollowUp: insertClient.nextFollowUp ?? null,
    };

    const result = await db.insert(clients).values(values).returning();
    return result[0];
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const updates: any = { ...clientData, updatedAt: new Date() };

    if (clientData.pipelineValue !== undefined) {
      updates.pipelineValue =
        clientData.pipelineValue === null
          ? null
          : typeof clientData.pipelineValue === "number"
          ? clientData.pipelineValue.toString()
          : clientData.pipelineValue;
    }

    if (clientData.tags !== undefined) {
      updates.tags = clientData.tags;
    }

    const result = await db.update(clients)
      .set(updates)
      .where(eq(clients.id, id))
      .returning();
    return result[0];
  }

  async updateClientWithCompanyCheck(id: string, clientData: Partial<InsertClient>, companyId: string): Promise<Client | undefined> {
    const updates: any = { ...clientData, updatedAt: new Date() };

    if (clientData.pipelineValue !== undefined) {
      updates.pipelineValue =
        clientData.pipelineValue === null
          ? null
          : typeof clientData.pipelineValue === "number"
          ? clientData.pipelineValue.toString()
          : clientData.pipelineValue;
    }

    if (clientData.tags !== undefined) {
      updates.tags = clientData.tags;
    }

    const result = await db.update(clients)
      .set(updates)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
      .returning();
    return result[0];
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  async deleteClientWithCompanyCheck(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(clients)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async getClientPipelineSummary(companyId: string): Promise<ClientPipelineSummary> {
    const clientList = await this.getClientsByCompany(companyId);
    return buildPipelineSummary(clientList);
  }

  async getClientInteractions(clientId: string, companyId: string): Promise<ClientInteraction[]> {
    const result = await db
      .select()
      .from(clientInteractions)
      .where(and(eq(clientInteractions.clientId, clientId), eq(clientInteractions.companyId, companyId)))
      .orderBy(desc(clientInteractions.occurredAt));
    return result;
  }

  async createClientInteraction(insertInteraction: InsertClientInteraction): Promise<ClientInteraction> {
    const values = {
      ...insertInteraction,
      channel: insertInteraction.channel ?? null,
      nextSteps: insertInteraction.nextSteps ?? null,
      nextFollowUp: insertInteraction.nextFollowUp ?? null,
      stage: insertInteraction.stage ?? null,
      createdBy: insertInteraction.createdBy ?? null,
    };

    const result = await db.insert(clientInteractions).values(values).returning();
    const interaction = result[0];

    if (interaction) {
      const client = await this.getClient(interaction.clientId);
      if (client) {
        const updates: any = {
          lastContactAt: interaction.occurredAt,
          nextFollowUp: interaction.nextFollowUp ?? client.nextFollowUp ?? null,
          updatedAt: new Date(),
        };

        if (interaction.stage) {
          updates.stage = interaction.stage;
        }

        await db.update(clients).set(updates).where(eq(clients.id, client.id));
      }
    }

    return interaction;
  }

  // Contract methods
  async getContract(id: string): Promise<Contract | undefined> {
    const result = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return result[0];
  }

  async getContractWithCompanyCheck(id: string, companyId: string): Promise<Contract | undefined> {
    const result = await db.select().from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.companyId, companyId)))
      .limit(1);
    return result[0];
  }

  async getContractsByCompany(companyId: string): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.companyId, companyId));
  }

  async getContractsWithDetailsByCompany(companyId: string): Promise<ContractWithDetails[]> {
    const result = await db
      .select({
        // Contract fields
        id: contracts.id,
        type: contracts.type,
        propertyId: contracts.propertyId,
        clientId: contracts.clientId,
        value: contracts.value,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        status: contracts.status,
        terms: contracts.terms,
        commission: contracts.commission,
        companyId: contracts.companyId,
        createdAt: contracts.createdAt,
        updatedAt: contracts.updatedAt,
        // Property fields
        propertyTitle: properties.title,
        propertyAddress: properties.address,
        // Client fields
        clientName: clients.name,
        clientEmail: clients.email,
      })
      .from(contracts)
      .leftJoin(properties, eq(contracts.propertyId, properties.id))
      .leftJoin(clients, eq(contracts.clientId, clients.id))
      .where(eq(contracts.companyId, companyId));

    return result.map(row => ({
      id: row.id,
      type: row.type,
      propertyId: row.propertyId,
      clientId: row.clientId,
      value: row.value,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      terms: row.terms,
      commission: row.commission,
      companyId: row.companyId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      property: {
        id: row.propertyId,
        title: row.propertyTitle!,
        address: row.propertyAddress!,
      },
      client: {
        id: row.clientId,
        name: row.clientName!,
        email: row.clientEmail!,
      },
    }));
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    const result = await db.insert(contracts).values(insertContract).returning();
    return result[0];
  }

  async updateContract(id: string, contractData: Partial<InsertContract>): Promise<Contract | undefined> {
    const result = await db.update(contracts)
      .set({ ...contractData, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return result[0];
  }

  async updateContractWithCompanyCheck(id: string, contractData: Partial<InsertContract>, companyId: string): Promise<Contract | undefined> {
    const result = await db.update(contracts)
      .set({ ...contractData, updatedAt: new Date() })
      .where(and(eq(contracts.id, id), eq(contracts.companyId, companyId)))
      .returning();
    return result[0];
  }

  async deleteContract(id: string): Promise<boolean> {
    const result = await db.delete(contracts).where(eq(contracts.id, id)).returning();
    return result.length > 0;
  }

  async deleteContractWithCompanyCheck(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  // Transaction methods
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    return result[0];
  }

  async getTransactionWithCompanyCheck(id: string, companyId: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId)))
      .limit(1);
    return result[0];
  }

  async getTransactionsByCompany(companyId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.companyId, companyId));
  }

  async getTransactionsWithDetailsByCompany(companyId: string): Promise<TransactionWithDetails[]> {
    const result = await db
      .select({
        // Transaction fields
        id: transactions.id,
        type: transactions.type,
        category: transactions.category,
        description: transactions.description,
        amount: transactions.amount,
        dueDate: transactions.dueDate,
        paidDate: transactions.paidDate,
        status: transactions.status,
        contractId: transactions.contractId,
        companyId: transactions.companyId,
        createdAt: transactions.createdAt,
        // Contract fields (nullable)
        contractType: contracts.type,
        contractIdField: contracts.id,
        // Property fields (nullable)
        propertyId: properties.id,
        propertyTitle: properties.title,
        // Client fields (nullable)
        clientId: clients.id,
        clientName: clients.name,
      })
      .from(transactions)
      .leftJoin(contracts, eq(transactions.contractId, contracts.id))
      .leftJoin(properties, eq(contracts.propertyId, properties.id))
      .leftJoin(clients, eq(contracts.clientId, clients.id))
      .where(eq(transactions.companyId, companyId));

    return result.map(row => {
      const transaction: TransactionWithDetails = {
        id: row.id,
        type: row.type,
        category: row.category,
        description: row.description,
        amount: row.amount,
        dueDate: row.dueDate,
        paidDate: row.paidDate,
        status: row.status,
        contractId: row.contractId,
        companyId: row.companyId,
        createdAt: row.createdAt,
      };

      if (row.contractIdField && row.propertyId && row.clientId) {
        transaction.contract = {
          id: row.contractIdField,
          type: row.contractType!,
          property: {
            id: row.propertyId,
            title: row.propertyTitle!,
          },
          client: {
            id: row.clientId,
            name: row.clientName!,
          },
        };
      }

      return transaction;
    });
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(insertTransaction).returning();
    return result[0];
  }

  async updateTransaction(id: string, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const result = await db.update(transactions)
      .set(transactionData)
      .where(eq(transactions.id, id))
      .returning();
    return result[0];
  }

  async updateTransactionWithCompanyCheck(id: string, transactionData: Partial<InsertTransaction>, companyId: string): Promise<Transaction | undefined> {
    const result = await db.update(transactions)
      .set(transactionData)
      .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId)))
      .returning();
    return result[0];
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id)).returning();
    return result.length > 0;
  }

  async deleteTransactionWithCompanyCheck(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  // Activity methods
  async getActivitiesByCompany(companyId: string, limit = 10): Promise<Activity[]> {
    return await db.select().from(activities)
      .where(eq(activities.companyId, companyId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(insertActivity).returning();
    return result[0];
  }

  // Construction methods
  async getConstruction(id: string): Promise<Construction | undefined> {
    const result = await db.select().from(constructions).where(eq(constructions.id, id)).limit(1);
    return result[0];
  }

  async getConstructionWithCompanyCheck(id: string, companyId: string): Promise<Construction | undefined> {
    const result = await db.select().from(constructions)
      .where(and(eq(constructions.id, id), eq(constructions.companyId, companyId)))
      .limit(1);
    return result[0];
  }

  async getConstructionsByCompany(companyId: string): Promise<Construction[]> {
    return await db.select().from(constructions).where(eq(constructions.companyId, companyId));
  }

  async getConstructionsWithDetailsByCompany(companyId: string): Promise<ConstructionWithDetails[]> {
    const result = await db
      .select({
        // Construction fields
        id: constructions.id,
        name: constructions.name,
        description: constructions.description,
        propertyId: constructions.propertyId,
        status: constructions.status,
        budget: constructions.budget,
        spent: constructions.spent,
        startDate: constructions.startDate,
        endDate: constructions.endDate,
        expectedEndDate: constructions.expectedEndDate,
        progress: constructions.progress,
        contractor: constructions.contractor,
        contractorContact: constructions.contractorContact,
        notes: constructions.notes,
        companyId: constructions.companyId,
        createdAt: constructions.createdAt,
        updatedAt: constructions.updatedAt,
        // Property fields
        propertyTitle: properties.title,
        propertyAddress: properties.address,
      })
      .from(constructions)
      .leftJoin(properties, eq(constructions.propertyId, properties.id))
      .where(eq(constructions.companyId, companyId));

    return result.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      propertyId: row.propertyId,
      status: row.status,
      budget: row.budget,
      spent: row.spent,
      startDate: row.startDate,
      endDate: row.endDate,
      expectedEndDate: row.expectedEndDate,
      progress: row.progress,
      contractor: row.contractor,
      contractorContact: row.contractorContact,
      notes: row.notes,
      companyId: row.companyId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      property: {
        id: row.propertyId,
        title: row.propertyTitle!,
        address: row.propertyAddress!,
      },
    }));
  }

  async createConstruction(insertConstruction: InsertConstruction): Promise<Construction> {
    const result = await db.insert(constructions).values(insertConstruction).returning();
    return result[0];
  }

  async updateConstruction(id: string, constructionData: Partial<InsertConstruction>): Promise<Construction | undefined> {
    const result = await db.update(constructions)
      .set({ ...constructionData, updatedAt: new Date() })
      .where(eq(constructions.id, id))
      .returning();
    return result[0];
  }

  async updateConstructionWithCompanyCheck(id: string, constructionData: Partial<InsertConstruction>, companyId: string): Promise<Construction | undefined> {
    const result = await db.update(constructions)
      .set({ ...constructionData, updatedAt: new Date() })
      .where(and(eq(constructions.id, id), eq(constructions.companyId, companyId)))
      .returning();
    return result[0];
  }

  async deleteConstruction(id: string): Promise<boolean> {
    const result = await db.delete(constructions).where(eq(constructions.id, id)).returning();
    return result.length > 0;
  }

  async deleteConstructionWithCompanyCheck(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(constructions)
      .where(and(eq(constructions.id, id), eq(constructions.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  // Construction Task methods
  async getConstructionTask(id: string): Promise<ConstructionTask | undefined> {
    const result = await db.select().from(constructionTasks).where(eq(constructionTasks.id, id)).limit(1);
    return result[0];
  }

  async getConstructionTasksByConstruction(constructionId: string): Promise<ConstructionTask[]> {
    return await db.select().from(constructionTasks)
      .where(eq(constructionTasks.constructionId, constructionId))
      .orderBy(constructionTasks.order, constructionTasks.createdAt);
  }

  async createConstructionTask(insertTask: InsertConstructionTask): Promise<ConstructionTask> {
    const result = await db.insert(constructionTasks).values(insertTask).returning();
    return result[0];
  }

  async updateConstructionTask(id: string, taskData: Partial<InsertConstructionTask>): Promise<ConstructionTask | undefined> {
    const result = await db.update(constructionTasks)
      .set({ ...taskData, updatedAt: new Date() })
      .where(eq(constructionTasks.id, id))
      .returning();
    return result[0];
  }

  async deleteConstructionTask(id: string): Promise<boolean> {
    const result = await db.delete(constructionTasks).where(eq(constructionTasks.id, id)).returning();
    return result.length > 0;
  }

  // Construction Expense methods
  async getConstructionExpense(id: string): Promise<ConstructionExpense | undefined> {
    const result = await db.select().from(constructionExpenses).where(eq(constructionExpenses.id, id)).limit(1);
    return result[0];
  }

  async getConstructionExpensesByConstruction(constructionId: string): Promise<ConstructionExpense[]> {
    return await db.select().from(constructionExpenses)
      .where(eq(constructionExpenses.constructionId, constructionId))
      .orderBy(desc(constructionExpenses.expenseDate));
  }

  async createConstructionExpense(insertExpense: InsertConstructionExpense): Promise<ConstructionExpense> {
    const result = await db.insert(constructionExpenses).values(insertExpense).returning();
    return result[0];
  }

  async updateConstructionExpense(id: string, expenseData: Partial<InsertConstructionExpense>): Promise<ConstructionExpense | undefined> {
    const result = await db.update(constructionExpenses)
      .set(expenseData)
      .where(eq(constructionExpenses.id, id))
      .returning();
    return result[0];
  }

  async deleteConstructionExpense(id: string): Promise<boolean> {
    const result = await db.delete(constructionExpenses).where(eq(constructionExpenses.id, id)).returning();
    return result.length > 0;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return result[0];
  }

  async getAppointmentsByCompany(
    companyId: string,
    filters: {
      status?: string;
      clientId?: string;
      upcomingOnly?: boolean;
      limit?: number;
      fromDate?: Date;
      toDate?: Date;
    } = {},
  ): Promise<Appointment[]> {
    const result = await db.select().from(appointments).where(eq(appointments.companyId, companyId));
    const now = new Date();

    let filtered = result;

    if (filters.status) {
      filtered = filtered.filter(appointment => appointment.status === filters.status);
    }

    if (filters.clientId) {
      filtered = filtered.filter(appointment => appointment.clientId === filters.clientId);
    }

    if (filters.upcomingOnly) {
      filtered = filtered.filter(appointment => appointment.scheduledAt >= now);
    }

    if (filters.fromDate) {
      filtered = filtered.filter(appointment => appointment.scheduledAt >= filters.fromDate!);
    }

    if (filters.toDate) {
      filtered = filtered.filter(appointment => appointment.scheduledAt <= filters.toDate!);
    }

    filtered.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const values = {
      ...insertAppointment,
      propertyId: insertAppointment.propertyId ?? null,
      status: insertAppointment.status ?? "agendado",
      type: insertAppointment.type ?? "visita",
      durationMinutes: insertAppointment.durationMinutes ?? 60,
      notes: insertAppointment.notes ?? null,
      agentName: insertAppointment.agentName ?? null,
      channel: insertAppointment.channel ?? null,
    };

    const result = await db.insert(appointments).values(values).returning();
    const appointment = result[0];

    if (appointment) {
      const client = await this.getClient(appointment.clientId);
      if (client) {
        let stage = client.stage;
        if (appointment.status === "realizado") {
          stage = "fechado";
        } else if (appointment.status !== "cancelado" && client.stage === "novo") {
          stage = "visita_agendada";
        }

        const updates: any = {
          nextFollowUp: appointment.scheduledAt,
          updatedAt: new Date(),
        };

        if (stage !== client.stage) {
          updates.stage = stage;
        }

        await db.update(clients).set(updates).where(eq(clients.id, client.id));
      }
    }

    return appointment;
  }

  async updateAppointment(id: string, appointmentData: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const updates: any = { updatedAt: new Date() };

    if (appointmentData.status !== undefined) updates.status = appointmentData.status;
    if (appointmentData.type !== undefined) updates.type = appointmentData.type;
    if (appointmentData.scheduledAt !== undefined) updates.scheduledAt = appointmentData.scheduledAt;
    if (appointmentData.durationMinutes !== undefined) updates.durationMinutes = appointmentData.durationMinutes;
    if (appointmentData.propertyId !== undefined) updates.propertyId = appointmentData.propertyId;
    if (appointmentData.notes !== undefined) updates.notes = appointmentData.notes;
    if (appointmentData.agentName !== undefined) updates.agentName = appointmentData.agentName;
    if (appointmentData.channel !== undefined) updates.channel = appointmentData.channel;

    const result = await db.update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();

    const appointment = result[0];
    if (!appointment) {
      return undefined;
    }

    const client = await this.getClient(appointment.clientId);
    if (client) {
      const updatesToClient: any = {
        nextFollowUp: appointment.scheduledAt,
        updatedAt: new Date(),
      };

      if (appointment.status === "realizado") {
        updatesToClient.stage = "fechado";
      } else if (appointment.status === "cancelado" && client.stage === "visita_agendada") {
        updatesToClient.stage = "qualificado";
      }

      await db.update(clients).set(updatesToClient).where(eq(clients.id, client.id));
    }

    return appointment;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id)).returning();
    return result.length > 0;
  }

  // Dashboard methods
  async getKPIsByCompany(companyId: string): Promise<{
    activeProperties: number;
    monthlyRevenue: string;
    activeContracts: number;
    monthlyLeads: number;
  }> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Get active properties count
    const activePropertiesResult = await db.select({ count: count() })
      .from(properties)
      .where(and(
        eq(properties.companyId, companyId),
        sql`${properties.status} IN ('disponivel', 'alugado')`
      ));

    // Get active contracts count
    const activeContractsResult = await db.select({ count: count() })
      .from(contracts)
      .where(and(
        eq(contracts.companyId, companyId),
        eq(contracts.status, 'ativo')
      ));

    // Get monthly leads count
    const monthlyLeadsResult = await db.select({ count: count() })
      .from(clients)
      .where(and(
        eq(clients.companyId, companyId),
        eq(clients.type, 'lead'),
        gte(clients.createdAt, startOfMonth),
        lte(clients.createdAt, endOfMonth)
      ));

    // Get monthly revenue sum
    const monthlyRevenueResult = await db.select({ 
      total: sum(transactions.amount) 
    })
      .from(transactions)
      .where(and(
        eq(transactions.companyId, companyId),
        eq(transactions.type, 'receita'),
        eq(transactions.status, 'pago'),
        gte(transactions.paidDate, startOfMonth),
        lte(transactions.paidDate, endOfMonth)
      ));

    const activeProperties = activePropertiesResult[0]?.count || 0;
    const activeContracts = activeContractsResult[0]?.count || 0;
    const monthlyLeads = monthlyLeadsResult[0]?.count || 0;
    const monthlyRevenue = Number(monthlyRevenueResult[0]?.total || '0');

    return {
      activeProperties,
      monthlyRevenue: `R$ ${(monthlyRevenue / 1000).toFixed(1)}K`,
      activeContracts,
      monthlyLeads,
    };
  }
}

export const storage = new DbStorage();
