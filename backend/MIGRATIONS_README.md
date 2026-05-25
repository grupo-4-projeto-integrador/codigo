# Migrations (backend)

This folder contains a minimal initial migration for the project's PostgreSQL schema.

Files
- `initial_schema.sql`: creates the `seguros` table used by the backend.

Apply the migration locally (example):

```bash
# create the database if it doesn't exist
createdb -U postgres seguros_db

# apply migration
psql -U postgres -d seguros_db -f migrations/initial_schema.sql

# (optional) restore seed data from the dump
psql -U postgres -d seguros_db -f ../legacy/seguros.sql
```

After applying the migration and (optionally) the seed data, run the backend and test the endpoints:

```bash
cd seguros-app/backend
# Set Postgres connection via environment variables (or create a `.env` from `.env.example`)
# Example (Linux / macOS):
# export PG_HOST=localhost
# export PG_PORT=5432
# export PG_USER=postgres
# export PG_PASSWORD=your_postgres_password
# export PG_DBNAME=seguros_db
#
# Example (PowerShell):
# $env:PG_HOST='localhost'
# $env:PG_PORT='5432'
# $env:PG_USER='postgres'
# $env:PG_PASSWORD='your_postgres_password'
# $env:PG_DBNAME='seguros_db'

go run ./cmd/api
curl http://localhost:8082/api/apolices

## CI / GitHub Actions

This repository includes a GitHub Actions workflow at `.github/workflows/ci.yml` that runs unit tests and an integration job which starts a Postgres service, applies migrations and runs the backend tests.

To allow the workflow to use a non-default database password in your organization/repository, add a secret in GitHub and update the workflow to read it instead of an inline password.

1. Add secret in GitHub:

   - Go to your repository on GitHub → Settings → Secrets and variables → Actions → New repository secret.
   - Name: `POSTGRES_PASSWORD`
   - Value: your database password.

2. Update the workflow to use the secret:

   Locate the `backend-integration` job in `.github/workflows/ci.yml` and replace any inline password values with `${{ secrets.POSTGRES_PASSWORD }}`.

3. Seed data during CI:

   The integration job runs the migration with seed import enabled:

   ```bash
   go run ./cmd/migrate -seed
   ```

4. Verify the CI run:

   - Push a branch or open a PR.
   - In GitHub, go to Actions and open the `CI` workflow.
   - Inspect the `backend-integration` job logs.
   - Confirm the `Run migrations` step and the `Run integration tests` step completed successfully.

Notes

- The current workflow uses `postgres:15` as a service image and exposes port `5432` to the runner. Using a secret avoids storing credentials in the repo.
- If you prefer a local run of the same steps, you can run the migration and tests locally after setting the environment variables as shown above.
If you prefer Flyway, Liquibase or another migration tool, move the SQL into that tool's format.
