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

```sh
yarn db:migrate
```

Note: Kysely automatically knows which migrations have been executed or not
because it has its own internal table within our database where it stores the
migrations it's executed (and when it executed them). You'll be able to verify
that a migration has run successfully if it shows up in this query:

```sql
select * from kysely_migrations;
```

## How to Create a Migration

To create a migration file, run:

```sh
yarn db:migration:create
```

In the prompt, you'll need to enter a name for your migration, and then your
migration file will be created! Boom! 💥

## Common Errors

```
Error: corrupted migrations: previously executed migration <SOME_MIGRATION_NAME> is missing.
```

The easiest way to fix this is to re-setup your database by running:

```
yarn db:setup
```
