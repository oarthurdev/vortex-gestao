import { type User, type InsertUser, type Company, type InsertCompany, type Property, type InsertProperty, type Client, type InsertClient, type Contract, type InsertContract, type Transaction, type InsertTransaction, type Activity, type InsertActivity } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db } from "./db";
import { companies, users, properties, clients, contracts, transactions, activities } from "@shared/schema";
import { eq, and, desc, sql, count, sum, gte, lte } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

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
  
  // Contract methods
  getContract(id: string): Promise<Contract | undefined>;
  getContractWithCompanyCheck(id: string, companyId: string): Promise<Contract | undefined>;
  getContractsByCompany(companyId: string): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  updateContractWithCompanyCheck(id: string, contract: Partial<InsertContract>, companyId: string): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<boolean>;
  deleteContractWithCompanyCheck(id: string, companyId: string): Promise<boolean>;
  
  // Transaction methods
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionWithCompanyCheck(id: string, companyId: string): Promise<Transaction | undefined>;
  getTransactionsByCompany(companyId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  updateTransactionWithCompanyCheck(id: string, transaction: Partial<InsertTransaction>, companyId: string): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;
  deleteTransactionWithCompanyCheck(id: string, companyId: string): Promise<boolean>;
  
  // Activity methods
  getActivitiesByCompany(companyId: string, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
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
  public sessionStore: session.Store;

  constructor() {
    this.companies = new Map();
    this.users = new Map();
    this.properties = new Map();
    this.clients = new Map();
    this.contracts = new Map();
    this.transactions = new Map();
    this.activities = new Map();
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
    const client: Client = {
      ...insertClient,
      id,
      document: insertClient.document ?? null,
      address: insertClient.address ?? null,
      notes: insertClient.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient = { ...client, ...clientData, updatedAt: new Date() };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async updateClientWithCompanyCheck(id: string, clientData: Partial<InsertClient>, companyId: string): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client || client.companyId !== companyId) return undefined;
    
    const updatedClient = { ...client, ...clientData, updatedAt: new Date() };
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
    const result = await db.insert(clients).values(insertClient).returning();
    return result[0];
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return result[0];
  }

  async updateClientWithCompanyCheck(id: string, clientData: Partial<InsertClient>, companyId: string): Promise<Client | undefined> {
    const result = await db.update(clients)
      .set({ ...clientData, updatedAt: new Date() })
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
