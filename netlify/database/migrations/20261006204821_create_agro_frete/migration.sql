CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"action" text NOT NULL,
	"meta" jsonb DEFAULT '{}' NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cargo_types" (
	"code" text PRIMARY KEY,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"has_animals" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"transport_id" uuid NOT NULL,
	"uploader_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"number" text,
	"issued_on" date,
	"valid_until" date,
	"note" text,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"blob_key" text NOT NULL UNIQUE,
	"status" text DEFAULT 'in_review' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_costs" (
	"user_id" uuid PRIMARY KEY,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farm_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"farm_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"location" geography(Point,4326) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"state_code" text NOT NULL,
	"municipality_ibge" integer,
	"address_reference" text,
	"road_type" text,
	"access_notes" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"location" geography(Point,4326) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid,
	"favorite_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_pkey" PRIMARY KEY("user_id","favorite_id")
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"ibge_code" integer PRIMARY KEY,
	"name" text NOT NULL,
	"state_code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"url" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place_favorites" (
	"user_id" uuid,
	"place_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_favorites_pkey" PRIMARY KEY("user_id","place_id")
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"state_code" text,
	"municipality_ibge" integer,
	"address_reference" text,
	"phone" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"location" geography(Point,4326) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"plan_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"interval_days" integer DEFAULT 30 NOT NULL,
	"features" jsonb DEFAULT '{}' NOT NULL,
	"limits" jsonb DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL UNIQUE,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" uuid NOT NULL,
	"transporter_id" uuid NOT NULL,
	"truck_id" uuid,
	"price_cents" integer NOT NULL,
	"eta_note" text,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"transport_id" uuid NOT NULL,
	"rater_id" uuid NOT NULL,
	"ratee_id" uuid NOT NULL,
	"overall" integer NOT NULL,
	"scores" jsonb DEFAULT '{}' NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_overall_valid" CHECK ("overall" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "road_report_votes" (
	"report_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "road_report_votes_pkey" PRIMARY KEY("report_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "road_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"note" text,
	"location" geography(Point,4326) NOT NULL,
	"confirmations" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"distance_m" integer NOT NULL,
	"duration_s" integer NOT NULL,
	"paved_m" integer DEFAULT 0 NOT NULL,
	"unpaved_m" integer DEFAULT 0 NOT NULL,
	"unknown_m" integer DEFAULT 0 NOT NULL,
	"coordinates" jsonb NOT NULL,
	"waypoints" jsonb DEFAULT '[]' NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"profile" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"code" text PRIMARY KEY,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"plan_id" integer,
	"status" text DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"transport_id" uuid NOT NULL,
	"location" geography(Point,4326) NOT NULL,
	"speed_kmh" double precision,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_animals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" uuid NOT NULL,
	"category_code" text NOT NULL,
	"quantity" integer NOT NULL,
	"approx_weight_kg" double precision
);
--> statement-breakpoint
CREATE TABLE "transport_cargo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" double precision NOT NULL,
	"weight_kg" double precision
);
--> statement-breakpoint
CREATE TABLE "transport_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"transport_id" uuid NOT NULL,
	"status" text NOT NULL,
	"user_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"producer_id" uuid NOT NULL,
	"origin_farm_id" uuid,
	"origin_name" text NOT NULL,
	"origin" geography(Point,4326) NOT NULL,
	"dest_name" text NOT NULL,
	"dest_kind" text DEFAULT 'outro' NOT NULL,
	"dest" geography(Point,4326) NOT NULL,
	"pickup_date" date,
	"pickup_time" time,
	"tolerance_minutes" integer,
	"urgent" boolean DEFAULT false NOT NULL,
	"flexible" boolean DEFAULT false NOT NULL,
	"notes" text,
	"route_id" uuid,
	"cargo_type" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" uuid NOT NULL UNIQUE,
	"quote_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"transporter_id" uuid NOT NULL,
	"truck_id" uuid,
	"status" text DEFAULT 'documentation' NOT NULL,
	"tracking_active" boolean DEFAULT false NOT NULL,
	"cancel_reason" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trucks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" uuid NOT NULL,
	"plate" text NOT NULL UNIQUE,
	"brand" text,
	"model" text,
	"year" integer,
	"type" text NOT NULL,
	"body_type" text,
	"capacity_heads" integer,
	"capacity_tons" double precision,
	"km_per_liter" double precision,
	"cargo_types" text[] DEFAULT ARRAY['bovinos']::text[] NOT NULL,
	"compartments" integer,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid,
	"role" text,
	CONSTRAINT "user_roles_pkey" PRIMARY KEY("user_id","role"),
	CONSTRAINT "user_roles_valid" CHECK ("role" IN ('producer','transporter','admin'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"email" citext NOT NULL UNIQUE,
	"phone" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"share_phone" boolean DEFAULT true NOT NULL,
	"whatsapp_alerts" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_action_date_idx" ON "audit_logs" ("action","created_at");--> statement-breakpoint
CREATE INDEX "farms_owner_idx" ON "farms" ("owner_id");--> statement-breakpoint
CREATE INDEX "municipalities_state_idx" ON "municipalities" ("state_code");--> statement-breakpoint
CREATE INDEX "notifications_user_date_idx" ON "notifications" ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_requests_pending_unique" ON "plan_requests" ("user_id","plan_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_request_transporter_unique" ON "quotes" ("request_id","transporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_transport_rater_unique" ON "ratings" ("transport_id","rater_id");--> statement-breakpoint
CREATE INDEX "tracking_transport_date_idx" ON "tracking_points" ("transport_id","recorded_at");--> statement-breakpoint
CREATE INDEX "requests_status_date_idx" ON "transport_requests" ("status","pickup_date");--> statement-breakpoint
CREATE INDEX "requests_producer_idx" ON "transport_requests" ("producer_id");--> statement-breakpoint
CREATE INDEX "transports_producer_idx" ON "transports" ("producer_id");--> statement-breakpoint
CREATE INDEX "transports_transporter_idx" ON "transports" ("transporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_phone_unique" ON "users" ("phone") WHERE "phone" <> '' AND "status" <> 'deleted';--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_transport_id_transports_id_fkey" FOREIGN KEY ("transport_id") REFERENCES "transports"("id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploader_id_users_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "driver_costs" ADD CONSTRAINT "driver_costs_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "farm_points" ADD CONSTRAINT "farm_points_farm_id_farms_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_state_code_states_code_fkey" FOREIGN KEY ("state_code") REFERENCES "states"("code");--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_municipality_ibge_municipalities_ibge_code_fkey" FOREIGN KEY ("municipality_ibge") REFERENCES "municipalities"("ibge_code");--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_favorite_id_users_id_fkey" FOREIGN KEY ("favorite_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "municipalities" ADD CONSTRAINT "municipalities_state_code_states_code_fkey" FOREIGN KEY ("state_code") REFERENCES "states"("code");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id");--> statement-breakpoint
ALTER TABLE "place_favorites" ADD CONSTRAINT "place_favorites_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "place_favorites" ADD CONSTRAINT "place_favorites_place_id_places_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id");--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_state_code_states_code_fkey" FOREIGN KEY ("state_code") REFERENCES "states"("code");--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_municipality_ibge_municipalities_ibge_code_fkey" FOREIGN KEY ("municipality_ibge") REFERENCES "municipalities"("ibge_code");--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id");--> statement-breakpoint
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_decided_by_users_id_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_request_id_transport_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "transport_requests"("id");--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_transporter_id_users_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_truck_id_trucks_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id");--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_transport_id_transports_id_fkey" FOREIGN KEY ("transport_id") REFERENCES "transports"("id");--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_id_users_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ratee_id_users_id_fkey" FOREIGN KEY ("ratee_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "road_report_votes" ADD CONSTRAINT "road_report_votes_report_id_road_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "road_reports"("id");--> statement-breakpoint
ALTER TABLE "road_report_votes" ADD CONSTRAINT "road_report_votes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "road_reports" ADD CONSTRAINT "road_reports_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id");--> statement-breakpoint
ALTER TABLE "tracking_points" ADD CONSTRAINT "tracking_points_transport_id_transports_id_fkey" FOREIGN KEY ("transport_id") REFERENCES "transports"("id");--> statement-breakpoint
ALTER TABLE "transport_animals" ADD CONSTRAINT "transport_animals_request_id_transport_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "transport_requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_cargo" ADD CONSTRAINT "transport_cargo_request_id_transport_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "transport_requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transport_events" ADD CONSTRAINT "transport_events_transport_id_transports_id_fkey" FOREIGN KEY ("transport_id") REFERENCES "transports"("id");--> statement-breakpoint
ALTER TABLE "transport_events" ADD CONSTRAINT "transport_events_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_producer_id_users_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_origin_farm_id_farms_id_fkey" FOREIGN KEY ("origin_farm_id") REFERENCES "farms"("id");--> statement-breakpoint
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_route_id_routes_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id");--> statement-breakpoint
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_cargo_type_cargo_types_code_fkey" FOREIGN KEY ("cargo_type") REFERENCES "cargo_types"("code");--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_request_id_transport_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "transport_requests"("id");--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_quote_id_quotes_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id");--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_producer_id_users_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_transporter_id_users_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_truck_id_trucks_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id");--> statement-breakpoint
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;