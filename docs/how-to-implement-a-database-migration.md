# How to Implement a Database Migration

## Context

We are using [PostgreSQL](https://www.postgresql.org) as our primary database,
and [Kysely](https://kysely.dev) as our query builder to communicate with our
database. Kysely also supports classic "up"/"down" migrations.

## Where Our Migrations Live

All of our database migrations live in our `@oyster/db` package, specifically
[here](../packages/db/src/migrations).

## How to Run Migrations

We have a [`migrate`](../packages/db/src/scripts/migrate.ts) script, which
effectively executes any migrations that haven't been executed yet. To run this
script:

```
yarn db:migrate
```

Note: Kysely automatically knows which migrations have been executed or not
because it has its own internal table within our database where it stores the
migrations it's executed (and when it executed them). You'll be able to verify
that a migration has run successfully if it shows up in this query:

```sql
select * from kysely_migrations;
```

## How to Name Migrations

We have to establish some sort of order for migrations to run, given that these
are classic "up"/"down" migrations. To establish this order, we'll name our
files in the following manner:

```
<ISO_TIMESTAMP>-<MIGRATION_NAME>.ts
```

For example, a valid migration name is:

```
20240311103301_job_offers.ts
```

## Common Errors

```
Error: corrupted migrations: previously executed migration <SOME_MIGRATION_NAME> is missing.
```

The easiest way to fix this is to re-setup your database by running:

```
yarn db:setup
```
