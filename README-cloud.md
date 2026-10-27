# OpenPencil Cloud: Build, Install, and Run

OpenPencil Cloud is an optional self-hosted backend. It requires Node.js 22+, PostgreSQL 15+, and an S3-compatible object store. SMTP is optional.

## Install dependencies

From the repository root:

```sh
bun install
```

## Build

```sh
bun run build:packages
bun run build:cloud-portal
bun --filter @open-pencil/cloud build:standalone
```

Build outputs:

```text
dist-cloud-portal/
packages/cloud/dist-standalone/server.mjs
```

The standalone bundle can run on a host with Node.js without installing `node_modules`.

## Configure

Create a deployment configuration and environment file:

```sh
cp packages/cloud/deploy/openpencil-cloud.example.toml openpencil-cloud.toml
cp packages/cloud/deploy/.env.example .env
```

Set at least these values in `.env`:

```env
OPENPENCIL_CLOUD_CONFIG=./openpencil-cloud.toml
OPENPENCIL_CLOUD_PORTAL_DIR=./dist-cloud-portal
PORT=8787

DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=at-least-32-random-characters
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

Update `openpencil-cloud.toml` with the public URL, editor URL, trusted origins, database, and object-storage settings.

## Run the built server

```sh
node --env-file=.env packages/cloud/dist-standalone/server.mjs
```

The server listens on port `8787` by default. Database migrations run before it accepts requests. Readiness is available at:

```text
GET /ready
```

## Local development

With Docker running, start PostgreSQL, SeaweedFS, Mailpit, the portal, and Cloud with:

```sh
bun run cloud:dev
```

Stop the development services with:

```sh
bun run cloud:dev:down
```

## Tests

```sh
bun run test:cloud
bun --filter @open-pencil/cloud test:e2e
```
