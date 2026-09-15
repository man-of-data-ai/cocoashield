-- Baseline du schéma CocoaShield — générée depuis les entités TypeORM et le schéma Better Auth.
-- Amorce une base vierge en production (synchronize=false) ; les migrations datées suivantes
-- restent idempotentes et deviennent des no-ops sur une base créée par cette baseline.
-- Régénération : npx typeorm-ts-node-commonjs schema:log -d src/data-source.ts (base vide)
--              + npm run auth:generate

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- gen_random_uuid() est native depuis PostgreSQL 13, mais 20260827 et
-- 20260905 s'en servent : l'extension rend la chaîne indépendante de la
-- version du serveur au lieu de dépendre d'un implicite.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tables Better Auth
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "username" text unique, "displayUsername" text);

create table "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");
-- Tables applicatives (entités TypeORM)
CREATE TABLE "mission" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "owner_id" character varying NOT NULL, "name" character varying NOT NULL, "mission_date" TIMESTAMP WITH TIME ZONE, "notes" text, CONSTRAINT "PK_54f1391034bc7dd30666dee0d4c" PRIMARY KEY ("id"));
CREATE INDEX "IDX_814320662bef5be39866094e95" ON "mission"  ("owner_id");
CREATE TYPE "public"."parcel_status_enum" AS ENUM('not_analyzed', 'analyzing', 'sick', 'healthy');
CREATE TYPE "public"."parcel_terrain_verification_status_enum" AS ENUM('pending', 'verified', 'false_positive');
CREATE TABLE "parcel" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "owner_id" character varying NOT NULL, "name" character varying NOT NULL, "boundary" geometry(Polygon,4326) NOT NULL, "status" "public"."parcel_status_enum" NOT NULL DEFAULT 'not_analyzed', "terrain_verification_status" "public"."parcel_terrain_verification_status_enum" NOT NULL DEFAULT 'pending', "terrain_verification_comment" text, "terrain_verified_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c01e9fed31b7433a00942d506b1" PRIMARY KEY ("id"));
CREATE INDEX "IDX_a7c5c87cd4ffc1e1129f0c5f43" ON "parcel"  ("owner_id");
CREATE TYPE "public"."analysis_status_enum" AS ENUM('pending', 'processing', 'completed');
CREATE TYPE "public"."analysis_result_enum" AS ENUM('healthy', 'infected');
CREATE TABLE "analysis" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "parcel_id" uuid NOT NULL, "status" "public"."analysis_status_enum" NOT NULL DEFAULT 'pending', "result" "public"."analysis_result_enum", "notes" text, "completed_at" TIMESTAMP WITH TIME ZONE, "infection_percentage" double precision, "severity_level" character varying, "affected_zones" jsonb, "report_generated_at" TIMESTAMP WITH TIME ZONE, "profile_id" character varying, "mission_id" uuid, CONSTRAINT "PK_300795d51c57ef52911ed65851f" PRIMARY KEY ("id"));
CREATE INDEX "IDX_68461b2445603b81e4d7687035" ON "analysis"  ("parcel_id");
CREATE INDEX "IDX_e9d902bb7184ced6d9f2607d50" ON "analysis"  ("profile_id");
CREATE INDEX "IDX_054f12d4b8cc58aca1f1804a92" ON "analysis"  ("mission_id");
CREATE TYPE "public"."analysis_image_source_enum" AS ENUM('mobile', 'upload');
CREATE TYPE "public"."analysis_image_status_enum" AS ENUM('pending', 'processed', 'failed');
CREATE TYPE "public"."analysis_image_result_enum" AS ENUM('healthy', 'infected');
CREATE TYPE "public"."analysis_image_geolocation_quality_enum" AS ENUM('precise', 'approximate', 'none');
CREATE TABLE "analysis_image" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "analysis_id" uuid NOT NULL, "file_path" character varying NOT NULL, "source" "public"."analysis_image_source_enum" NOT NULL, "status" "public"."analysis_image_status_enum" NOT NULL DEFAULT 'pending', "result" "public"."analysis_image_result_enum", "confidence" double precision, "latitude" double precision, "longitude" double precision, "geolocation_quality" "public"."analysis_image_geolocation_quality_enum" NOT NULL DEFAULT 'none', CONSTRAINT "PK_0de0577f44920d398a32d70df52" PRIMARY KEY ("id"));
CREATE INDEX "IDX_f6ea8ee9c6f55b7aa90f981ac5" ON "analysis_image"  ("analysis_id");
CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "user_email" character varying, "action" character varying NOT NULL, "target_type" character varying, "target_id" character varying, "target_label" character varying, "ip_address" character varying, "details" jsonb, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"));
CREATE INDEX "IDX_cb11bd5b662431ea0ac455a27d" ON "audit_log"  ("user_id");
CREATE INDEX "IDX_d97ed2d89b5635b0d46dcef890" ON "audit_log"  ("user_email");
CREATE INDEX "IDX_951e6339a77994dfbad976b35c" ON "audit_log"  ("action");
CREATE INDEX "IDX_a1e193da7f5ac0412acd6572f2" ON "audit_log"  ("target_type");
CREATE INDEX "IDX_7368834c55d62d1853a7eef090" ON "audit_log"  ("target_id");
CREATE TYPE "public"."exports_scope_enum" AS ENUM('zone', 'mission', 'period');
CREATE TYPE "public"."exports_format_enum" AS ENUM('geojson', 'shapefile', 'kml-kmz', 'csv', 'pdf');
CREATE TABLE "exports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "user_email" character varying, "scope" "public"."exports_scope_enum" NOT NULL, "scope_label" character varying NOT NULL, "format" "public"."exports_format_enum" NOT NULL, "include_source_images" boolean NOT NULL DEFAULT false, "verified_only" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_bcf8528d214cbfc68c01f337511" PRIMARY KEY ("id"));
CREATE INDEX "IDX_9436a31587064c89086706f407" ON "exports"  ("user_id");
CREATE TABLE "drone_profile" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "owner_id" character varying NOT NULL, "profile_id" character varying NOT NULL, "manufacturer" character varying NOT NULL, "model" character varying NOT NULL, "rtk_precision_cm" double precision, "metadata_format" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a86f95bae2e0e428ef55186dfd1" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "IDX_6e094615bd1e1d2db2326b81a0" ON "drone_profile"  ("owner_id", "profile_id");
CREATE TABLE "platform_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "owner_id" character varying NOT NULL, "severity_moderate" double precision NOT NULL DEFAULT '0.1', "severity_high" double precision NOT NULL DEFAULT '0.25', "severity_critical" double precision NOT NULL DEFAULT '0.4', "clustering_radius_m" double precision NOT NULL DEFAULT '20', "min_images_per_zone" integer NOT NULL DEFAULT '5', CONSTRAINT "PK_2934aeb70ec285196dcab4a2e96" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "IDX_fddc95d6bd9c6e18e2b7a39aba" ON "platform_settings"  ("owner_id");
CREATE TYPE "public"."app_user_profile_role_enum" AS ENUM('administrateur', 'direction_ccc', 'agronome_terrain');
CREATE TYPE "public"."app_user_profile_status_enum" AS ENUM('active', 'inactive');
CREATE TABLE "app_user_profile" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "role" "public"."app_user_profile_role_enum" NOT NULL DEFAULT 'agronome_terrain', "cooperative" character varying, "status" "public"."app_user_profile_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_e66ed379f8b17b06d03121ceff5" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "IDX_dda5a718945f3f43edca49970a" ON "app_user_profile"  ("user_id");
ALTER TABLE "analysis" ADD CONSTRAINT "FK_68461b2445603b81e4d7687035a" FOREIGN KEY ("parcel_id") REFERENCES "parcel"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "analysis" ADD CONSTRAINT "FK_054f12d4b8cc58aca1f1804a925" FOREIGN KEY ("mission_id") REFERENCES "mission"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "analysis_image" ADD CONSTRAINT "FK_f6ea8ee9c6f55b7aa90f981ac5b" FOREIGN KEY ("analysis_id") REFERENCES "analysis"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
