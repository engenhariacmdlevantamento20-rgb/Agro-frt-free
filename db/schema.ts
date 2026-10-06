import { sql } from "drizzle-orm";
import { pgTable, uuid, text, integer, doublePrecision, boolean, timestamp, date, time, jsonb, serial, customType, primaryKey, uniqueIndex, index, check } from "drizzle-orm/pg-core";

const geography = customType<{ data: string }>({ dataType: () => "geography(Point,4326)" });
const citext = customType<{ data: string }>({ dataType: () => "citext" });
const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), name: text("name").notNull(), email: citext("email").notNull().unique(),
  phone: text("phone").notNull().default(""), status: text("status").notNull().default("active"),
  verified: boolean("verified").notNull().default(false), sharePhone: boolean("share_phone").notNull().default(true),
  whatsappAlerts: boolean("whatsapp_alerts").notNull().default(false), createdAt: createdAt(),
}, (table) => [uniqueIndex("users_active_phone_unique").on(table.phone).where(sql`${table.phone} <> '' AND ${table.status} <> 'deleted'`)]);

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), role: text("role").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.role] }), check("user_roles_valid", sql`${table.role} IN ('producer','transporter','admin')`)]);

export const consents = pgTable("consents", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id), type: text("type").notNull(),
  version: text("version").notNull(), acceptedAt: timestamp("accepted_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(), userId: uuid("user_id").references(() => users.id), action: text("action").notNull(),
  meta: jsonb("meta").notNull().default({}), ip: text("ip"), createdAt: createdAt(),
}, (table) => [index("audit_logs_action_date_idx").on(table.action, table.createdAt)]);

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(), value: jsonb("value").notNull(), updatedAt: updatedAt(),
});

export const states = pgTable("states", {
  code: text("code").primaryKey(), name: text("name").notNull(), active: boolean("active").notNull().default(true),
});

export const municipalities = pgTable("municipalities", {
  ibgeCode: integer("ibge_code").primaryKey(), name: text("name").notNull(),
  stateCode: text("state_code").notNull().references(() => states.code), active: boolean("active").notNull().default(true),
}, (table) => [index("municipalities_state_idx").on(table.stateCode)]);

export const cargoTypes = pgTable("cargo_types", {
  code: text("code").primaryKey(), name: text("name").notNull(), unit: text("unit").notNull(),
  hasAnimals: boolean("has_animals").notNull().default(false), active: boolean("active").notNull().default(true), sort: integer("sort").notNull().default(0),
});

export const farms = pgTable("farms", {
  id: id(), ownerId: uuid("owner_id").notNull().references(() => users.id), name: text("name").notNull(),
  stateCode: text("state_code").notNull().references(() => states.code), municipalityIbge: integer("municipality_ibge").references(() => municipalities.ibgeCode),
  addressReference: text("address_reference"), roadType: text("road_type"), accessNotes: text("access_notes"),
  visibility: text("visibility").notNull().default("private"), location: geography("location").notNull(), createdAt: createdAt(),
}, (table) => [index("farms_owner_idx").on(table.ownerId)]);

export const farmPoints = pgTable("farm_points", {
  id: id(), farmId: uuid("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), name: text("name").notNull(), notes: text("notes"), location: geography("location").notNull(),
});

export const trucks = pgTable("trucks", {
  id: id(), ownerId: uuid("owner_id").notNull().references(() => users.id), plate: text("plate").notNull().unique(),
  brand: text("brand"), model: text("model"), year: integer("year"), type: text("type").notNull(), bodyType: text("body_type"),
  capacityHeads: integer("capacity_heads"), capacityTons: doublePrecision("capacity_tons"), kmPerLiter: doublePrecision("km_per_liter"),
  cargoTypes: text("cargo_types").array().notNull().default(sql`ARRAY['bovinos']::text[]`), compartments: integer("compartments"), notes: text("notes"),
  active: boolean("active").notNull().default(true), createdAt: createdAt(),
});

export const routes = pgTable("routes", {
  id: id(), distanceM: integer("distance_m").notNull(), durationS: integer("duration_s").notNull(),
  pavedM: integer("paved_m").notNull().default(0), unpavedM: integer("unpaved_m").notNull().default(0), unknownM: integer("unknown_m").notNull().default(0),
  coordinates: jsonb("coordinates").notNull(), waypoints: jsonb("waypoints").notNull().default([]),
  isCustom: boolean("is_custom").notNull().default(false), profile: text("profile"), createdAt: createdAt(),
});

export const transportRequests = pgTable("transport_requests", {
  id: id(), producerId: uuid("producer_id").notNull().references(() => users.id), originFarmId: uuid("origin_farm_id").references(() => farms.id),
  originName: text("origin_name").notNull(), origin: geography("origin").notNull(), destName: text("dest_name").notNull(),
  destKind: text("dest_kind").notNull().default("outro"), dest: geography("dest").notNull(), pickupDate: date("pickup_date"), pickupTime: time("pickup_time"),
  toleranceMinutes: integer("tolerance_minutes"), urgent: boolean("urgent").notNull().default(false), flexible: boolean("flexible").notNull().default(false),
  notes: text("notes"), routeId: uuid("route_id").references(() => routes.id), cargoType: text("cargo_type").notNull().references(() => cargoTypes.code),
  status: text("status").notNull().default("published"), createdAt: createdAt(),
}, (table) => [index("requests_status_date_idx").on(table.status, table.pickupDate), index("requests_producer_idx").on(table.producerId)]);

export const transportAnimals = pgTable("transport_animals", {
  id: id(), requestId: uuid("request_id").notNull().references(() => transportRequests.id, { onDelete: "cascade" }),
  categoryCode: text("category_code").notNull(), quantity: integer("quantity").notNull(), approxWeightKg: doublePrecision("approx_weight_kg"),
});

export const transportCargo = pgTable("transport_cargo", {
  id: id(), requestId: uuid("request_id").notNull().references(() => transportRequests.id, { onDelete: "cascade" }),
  description: text("description").notNull(), quantity: doublePrecision("quantity").notNull(), weightKg: doublePrecision("weight_kg"),
});

export const quotes = pgTable("quotes", {
  id: id(), requestId: uuid("request_id").notNull().references(() => transportRequests.id), transporterId: uuid("transporter_id").notNull().references(() => users.id),
  truckId: uuid("truck_id").references(() => trucks.id), priceCents: integer("price_cents").notNull(), etaNote: text("eta_note"), note: text("note"),
  status: text("status").notNull().default("pending"), createdAt: createdAt(),
}, (table) => [uniqueIndex("quotes_request_transporter_unique").on(table.requestId, table.transporterId)]);

export const transports = pgTable("transports", {
  id: id(), requestId: uuid("request_id").notNull().unique().references(() => transportRequests.id), quoteId: uuid("quote_id").notNull().references(() => quotes.id),
  producerId: uuid("producer_id").notNull().references(() => users.id), transporterId: uuid("transporter_id").notNull().references(() => users.id),
  truckId: uuid("truck_id").references(() => trucks.id), status: text("status").notNull().default("documentation"),
  trackingActive: boolean("tracking_active").notNull().default(false), cancelReason: text("cancel_reason"),
  startedAt: timestamp("started_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }), createdAt: createdAt(),
}, (table) => [index("transports_producer_idx").on(table.producerId), index("transports_transporter_idx").on(table.transporterId)]);

export const transportEvents = pgTable("transport_events", {
  id: id(), transportId: uuid("transport_id").notNull().references(() => transports.id), status: text("status").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id), note: text("note"), createdAt: createdAt(),
});

export const documents = pgTable("documents", {
  id: id(), transportId: uuid("transport_id").notNull().references(() => transports.id), uploaderId: uuid("uploader_id").notNull().references(() => users.id),
  kind: text("kind").notNull(), number: text("number"), issuedOn: date("issued_on"), validUntil: date("valid_until"), note: text("note"),
  filename: text("filename").notNull(), mime: text("mime").notNull(), size: integer("size").notNull(), blobKey: text("blob_key").notNull().unique(),
  status: text("status").notNull().default("in_review"), createdAt: createdAt(),
});

export const ratings = pgTable("ratings", {
  id: id(), transportId: uuid("transport_id").notNull().references(() => transports.id), raterId: uuid("rater_id").notNull().references(() => users.id),
  rateeId: uuid("ratee_id").notNull().references(() => users.id), overall: integer("overall").notNull(), scores: jsonb("scores").notNull().default({}),
  comment: text("comment"), createdAt: createdAt(),
}, (table) => [uniqueIndex("ratings_transport_rater_unique").on(table.transportId, table.raterId), check("ratings_overall_valid", sql`${table.overall} BETWEEN 1 AND 5`)]);

export const favorites = pgTable("favorites", {
  userId: uuid("user_id").notNull().references(() => users.id), favoriteId: uuid("favorite_id").notNull().references(() => users.id), createdAt: createdAt(),
}, (table) => [primaryKey({ columns: [table.userId, table.favoriteId] })]);

export const notifications = pgTable("notifications", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id), kind: text("kind").notNull(), title: text("title").notNull(),
  body: text("body"), url: text("url"), readAt: timestamp("read_at", { withTimezone: true }), createdAt: createdAt(),
}, (table) => [index("notifications_user_date_idx").on(table.userId, table.createdAt)]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id), endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(), auth: text("auth").notNull(), createdAt: createdAt(),
});

export const trackingPoints = pgTable("tracking_points", {
  id: id(), transportId: uuid("transport_id").notNull().references(() => transports.id), location: geography("location").notNull(),
  speedKmh: doublePrecision("speed_kmh"), recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("tracking_transport_date_idx").on(table.transportId, table.recordedAt)]);

export const roadReports = pgTable("road_reports", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id), kind: text("kind").notNull(), note: text("note"),
  location: geography("location").notNull(), confirmations: integer("confirmations").notNull().default(0),
  status: text("status").notNull().default("pending"), createdAt: createdAt(),
});

export const roadReportVotes = pgTable("road_report_votes", {
  reportId: uuid("report_id").notNull().references(() => roadReports.id), userId: uuid("user_id").notNull().references(() => users.id), createdAt: createdAt(),
}, (table) => [primaryKey({ columns: [table.reportId, table.userId] })]);

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(), code: text("code").notNull().unique(), name: text("name").notNull(),
  priceCents: integer("price_cents").notNull().default(0), intervalDays: integer("interval_days").notNull().default(30),
  features: jsonb("features").notNull().default({}), limits: jsonb("limits").notNull().default({}), active: boolean("active").notNull().default(true),
});

export const subscriptions = pgTable("subscriptions", {
  id: id(), userId: uuid("user_id").notNull().unique().references(() => users.id), planId: integer("plan_id").references(() => plans.id),
  status: text("status").notNull().default("trial"), trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }), createdAt: createdAt(),
});

export const payments = pgTable("payments", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id), subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  amountCents: integer("amount_cents").notNull(), status: text("status").notNull().default("paid"), provider: text("provider").notNull().default("manual"), createdAt: createdAt(),
});

export const planRequests = pgTable("plan_requests", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id), planId: integer("plan_id").notNull().references(() => plans.id),
  status: text("status").notNull().default("pending"), decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: uuid("decided_by").references(() => users.id), createdAt: createdAt(),
}, (table) => [uniqueIndex("plan_requests_pending_unique").on(table.userId, table.planId).where(sql`${table.status} = 'pending'`)]);

export const places = pgTable("places", {
  id: id(), name: text("name").notNull(), kind: text("kind").notNull(), stateCode: text("state_code").references(() => states.code),
  municipalityIbge: integer("municipality_ibge").references(() => municipalities.ibgeCode), addressReference: text("address_reference"),
  phone: text("phone"), notes: text("notes"), active: boolean("active").notNull().default(true), location: geography("location").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id), createdAt: createdAt(), updatedAt: updatedAt(),
});

export const placeFavorites = pgTable("place_favorites", {
  userId: uuid("user_id").notNull().references(() => users.id), placeId: uuid("place_id").notNull().references(() => places.id), createdAt: createdAt(),
}, (table) => [primaryKey({ columns: [table.userId, table.placeId] })]);

export const driverCosts = pgTable("driver_costs", {
  userId: uuid("user_id").primaryKey().references(() => users.id), data: jsonb("data").notNull().default({}), updatedAt: updatedAt(),
});
