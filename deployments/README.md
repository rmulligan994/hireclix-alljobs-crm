# Multi-Instance Deployment

This setup lets you deploy the same codebase to **multiple client instances**, each with its own Supabase project and **fully isolated data**.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Central GitHub Repo (this project)                              │
│  - Single source of truth for code                               │
│  - Migrations, Edge Functions, frontend                         │
└─────────────────────────────────────────────────────────────────┘
                              │
         deploy-all.sh (or GitHub Actions)
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Client A       │  │  Client B       │  │  Client C       │
│  Supabase       │  │  Supabase       │  │  Supabase       │
│  (isolated DB)  │  │  (isolated DB)  │  │  (isolated DB)  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

- **One Supabase project per client** = physical data isolation
- **Same schema everywhere** = migrations apply to all
- **Same Edge Functions** = deploy from central repo

---

## Quick Start

### 1. Add a new client instance

1. **Create Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard)
   - New project → name it (e.g. `acme-corp-crm`)
   - Save the **Project ID** (Settings → General)

2. **Add to config** – edit `deployments/instances.yaml`:

```yaml
instances:
  - name: acme-corp
    project_ref: "xyzabc123yourprojectid"
```

3. **Deploy**

```bash
./scripts/deploy-all.sh
```

### 2. Deploy code changes to all instances

```bash
# Deploy migrations + edge functions to ALL instances
./scripts/deploy-all.sh

# Deploy to a single instance only
./scripts/deploy-all.sh xyzabc123yourprojectid
```

---

## What gets deployed

| Item | Location | Command |
|------|----------|---------|
| **Tables, RLS, triggers** | `supabase/migrations/*.sql` | `supabase db push` |
| **Edge Functions** | `supabase/functions/*/` | `supabase functions deploy` |

---

## Prerequisites

- **Supabase CLI**: `npm install -g supabase`
- **Logged in**: `supabase login`
- **yq** (optional, for YAML): `brew install yq` – if missing, the script falls back to grep

---

## Per-instance configuration

Each Supabase project needs its own secrets. Configure in **Supabase Dashboard → Edge Functions → Secrets**:

| Secret | Purpose |
|--------|---------|
| `MAILGUN_API_KEY` | Email sending (campaigns) |
| `BEE_CLIENT_ID` | BeeFree email editor |
| `BEE_CLIENT_SECRET` | BeeFree email editor |

---

## Frontend deployment

The **frontend** (Vite/React app) is built once and can be deployed per client:

- **Option A**: Same build, different env files per client  
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` point to that client’s project
- **Option B**: Subdomain per client (e.g. `acme.yourdomain.com`) with env injected at build/deploy time

---

## CI/CD with GitHub Actions

Use `.github/workflows/deploy-instances.yml` to deploy on push to `main`:

1. Add `SUPABASE_ACCESS_TOKEN` as a repo secret
2. Add each project’s `SUPABASE_DB_PASSWORD` (or use a shared secret if acceptable)
3. On merge to `main`, migrations and functions deploy to all instances

---

## Terraform (optional)

For provisioning new Supabase projects programmatically, use the [Supabase Terraform provider](https://supabase.com/docs/guides/platform/terraform):

```hcl
resource "supabase_project" "client" {
  organization_id = var.org_id
  name            = "client-acme-corp"
  database_password = var.db_password
  region          = "us-east-1"
}
```

Then add the new `project_ref` to `instances.yaml` and run `deploy-all.sh`.
