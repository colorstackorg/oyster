# How to Implement a Database Migration

## Context

We are using [PostgreSQL](https://www.postgresql.org) as our primary database,
and [Kysely](https://kysely.dev) as our query builder to communicate with our
database. Kysely also supports classic "up"/"down" migrations.

## Where Our Migrations Live

All of our database migrations live in our `@oyster/core` package, specifically
[here](../packages/core/src/infrastructure/database/migrations).

## How to Run Migrations

We have a
[`migrate`](../packages/core/src/infrastructure/database/scripts/migrate.ts)
script, which effectively executes any migrations that haven't been executed
yet. To run this script:

```
yarn workspace @oyster/core db:migrate
```

If your migration updated the database schema, you can automatically generate
Typescript types for those changes by running:

```
yarn workspace @oyster/core db:types
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
2024-01-29T19:05:29Z-birthdate.ts
```

To get the ISO timestamp, you can simply open up a node terminal and run:

```
new Date()
```

and the output should be exactly what we want.
