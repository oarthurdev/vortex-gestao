import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  document: text("document").notNull().unique(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("corretor"), // admin, corretor, financeiro
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // apartamento, casa, comercial, terreno
  status: text("status").notNull().default("disponivel"), // disponivel, alugado, vendido, manutencao
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  area: decimal("area", { precision: 8, scale: 2 }),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  parkingSpaces: integer("parking_spaces"),
  address: text("address").notNull(),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  images: text("images").array(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  document: text("document"), // CPF/CNPJ
  type: text("type").notNull(), // lead, proprietario, locatario, comprador
  stage: text("stage").notNull().default("novo"), // novo, qualificado, visita_agendada, proposta, fechado, perdido
  source: text("source"),
  tags: text("tags").array(),
  pipelineValue: decimal("pipeline_value", { precision: 12, scale: 2 }),
  address: text("address"),
  notes: text("notes"),
  lastContactAt: timestamp("last_contact_at"),
  nextFollowUp: timestamp("next_follow_up"),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // locacao, venda
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("ativo"), // ativo, vencido, cancelado, renovado
  terms: text("terms"),
  commission: decimal("commission", { precision: 5, scale: 2 }),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // receita, despesa
  category: text("category").notNull(), // aluguel, venda, comissao, manutencao, etc
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  status: text("status").notNull().default("pendente"), // pendente, pago, vencido
  contractId: uuid("contract_id").references(() => contracts.id),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // contract_signed, lead_converted, payment_overdue, property_created
  title: text("title").notNull(),
  description: text("description"),
  entityType: text("entity_type"), // property, client, contract
  entityId: uuid("entity_id"),
  userId: uuid("user_id").references(() => users.id),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const constructions = pgTable("constructions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  status: text("status").notNull().default("planejamento"), // planejamento, em_andamento, pausada, concluida, cancelada
  budget: decimal("budget", { precision: 12, scale: 2 }),
  spent: decimal("spent", { precision: 12, scale: 2 }).default("0"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  expectedEndDate: timestamp("expected_end_date"),
  progress: integer("progress").default(0), // 0-100%
  contractor: text("contractor"),
  contractorContact: text("contractor_contact"),
  notes: text("notes"),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const constructionTasks = pgTable("construction_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  constructionId: uuid("construction_id").references(() => constructions.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pendente"), // pendente, em_andamento, concluida
  priority: text("priority").notNull().default("media"), // baixa, media, alta
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  assignedTo: text("assigned_to"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
  progress: integer("progress").default(0), // 0-100%
  order: integer("order").default(0),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const constructionExpenses = pgTable("construction_expenses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  constructionId: uuid("construction_id").references(() => constructions.id).notNull(),
  taskId: uuid("task_id").references(() => constructionTasks.id),
  description: text("description").notNull(),
  category: text("category").notNull(), // material, mao_de_obra, equipamento, outros
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  supplier: text("supplier"),
  receipt: text("receipt"), // URL or file path
  notes: text("notes"),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientInteractions = pgTable("client_interactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  type: text("type").notNull(), // contato_telefonico, whatsapp, email, visita, proposta, assinatura
  channel: text("channel"),
  summary: text("summary").notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  nextSteps: text("next_steps"),
  nextFollowUp: timestamp("next_follow_up"),
  stage: text("stage"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  type: text("type").notNull().default("visita"), // visita, reuniao, vistoria
  status: text("status").notNull().default("agendado"), // agendado, confirmado, realizado, cancelado, no_show
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").default(60),
  notes: text("notes"),
  agentName: text("agent_name"),
  channel: text("channel"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lastContactAt: z.coerce.date().optional(),
  nextFollowUp: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
  pipelineValue: z.union([z.string(), z.number()]).optional(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.coerce.date(),
  paidDate: z.coerce.date().optional(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertConstructionSchema = createInsertSchema(constructions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  expectedEndDate: z.coerce.date().optional(),
});

export const insertConstructionTaskSchema = createInsertSchema(constructionTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const insertConstructionExpenseSchema = createInsertSchema(constructionExpenses).omit({
  id: true,
  createdAt: true,
}).extend({
  expenseDate: z.coerce.date(),
});

export const insertClientInteractionSchema = createInsertSchema(clientInteractions).omit({
  id: true,
  createdAt: true,
}).extend({
  occurredAt: z.coerce.date(),
  nextFollowUp: z.coerce.date().optional(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledAt: z.coerce.date(),
});

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type ClientInteraction = typeof clientInteractions.$inferSelect;
export type InsertClientInteraction = z.infer<typeof insertClientInteractionSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Construction = typeof constructions.$inferSelect;
export type InsertConstruction = z.infer<typeof insertConstructionSchema>;

export type ConstructionTask = typeof constructionTasks.$inferSelect;
export type InsertConstructionTask = z.infer<typeof insertConstructionTaskSchema>;

export type ConstructionExpense = typeof constructionExpenses.$inferSelect;
export type InsertConstructionExpense = z.infer<typeof insertConstructionExpenseSchema>;

// Contract with related details
export interface ContractWithDetails extends Contract {
  property: {
    id: string;
    title: string;
    address: string;
  };
  client: {
    id: string;
    name: string;
    email: string;
  };
}

// Transaction with related details
export interface TransactionWithDetails extends Transaction {
  contract?: {
    id: string;
    type: string;
    property: {
      id: string;
      title: string;
    };
    client: {
      id: string;
      name: string;
    };
  };
}

// Construction with related details
export interface ConstructionWithDetails extends Construction {
  property: {
    id: string;
    title: string;
    address: string;
  };
  tasks?: ConstructionTask[];
  expenses?: ConstructionExpense[];
}

export interface PipelineStageSummary {
  stage: string;
  label: string;
  count: number;
  totalValue: number;
}

export interface ClientPipelineSummary {
  stages: PipelineStageSummary[];
  conversionRate: number;
  upcomingFollowUps: Array<{
    clientId: string;
    name: string;
    stage: string;
    nextFollowUp: Date;
  }>;
}
