# Contributing

First off, thank you for taking the time to contribute! 🥳 ColorStack is nothing
without its community, and that certainly extends to the software that we build.
This is a big team effort!

## First Things First

The #1 reason that we decided to open source Oyster was so that ColorStack
members can learn from and eventually contribute to a real-world production
codebase. Everything we do is centered around our helping our members fulfuill
their dreams of becoming software engineers. That being said, in order to make
space for our community, we will be prioritizing all contributions from
ColorStack members first, and then friends of ColorStack. ❤️

## Table of Contents

- [Local Development](#local-development)
  - [Prerequisites](#prerequisites)
    - [Installing Node w/ `nvm`](#installing-node-w-nvm)
  - [Fork and Clone Repository](#fork-and-clone-repository)
  - [Project Dependencies](#project-dependencies)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
    - [Postgres Setup](#postgres-setup)
    - [Executing Database Migrations](#executing-database-migrations)
    - [Seeding the Database](#seeding-the-database)
  - [Building the Project](#building-the-project)
  - [Running the Applications](#running-the-applications)
  - [Logging Into Applications](#logging-into-applications)
  - [Enabling Integrations](#enabling-integrations)
  - [Editor Setup](#editor-setup)
- [Making a Pull Request](#making-a-pull-request)
  - [Your First PR](#your-first-pr)
- [Deciding What to Work On](#deciding-what-to-work-on)
  - [Proposing Ideas](#proposing-ideas)
- [License](#license)

## Local Development

To get started with local development, please follow these simple steps.

### Prerequisites

Please ensure that you have the following software on your machine:

- [Bun](https://bun.sh)
- [Docker](https://docs.docker.com/engine/install)
- [Node.js](https://nodejs.org/en/download/package-manager) (v20.x.x)

#### Installing Node w/ `nvm`

Our recommendation is to use [`nvm`](https://nvm.sh) to install Node. The main
benefit of `nvm` is that it allows you to quickly install and use different
versions of Node on your machine.

If you choose to use `nvm`, we would also recommend setting up a
[shell integration](https://github.com/nvm-sh/nvm/blob/master/README.md#deeper-shell-integration),
which will automatically install the right node version for any given directory
that you're working in, as long as there is a [`.nvmrc`](./.nvmrc) file found in
that directory.

### Fork and Clone Repository

1. [Fork the repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo)
   to your own GitHub account.
2. [Clone the repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
   to your local machine.
   ```
   git clone https://github.com/<YOUR_USERNAME>/oyster.git
   ```
3. [Configure the upstream repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/configuring-a-remote-repository-for-a-fork),
   which will help you with
   [syncing your fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)
   with the Oyster codebase as new code is added to it in the future.
   ```
   git remote add upstream https://github.com/colorstackorg/oyster.git
   ```
4. Create a new branch.
   ```
   git checkout -b YOUR_BRANCH_NAME
   ```

### Project Dependencies

To install all project dependencies, run:

```sh
bun install
```

### Environment Variables

To set up your environment variables, run:

```
bun run env:setup
```

You'll now have `.env` files in all of your apps (and a couple packages)!

You'll notice that a lot of environment variables are empty. Most of these empty
variables are tied to the 3rd party integrations we have with platforms such as
Google for authentication. If you would like to enable these integrations in
development, please see the
[How to Enable Integrations](./docs/how-to-enable-integrations.md)
documentation.

### Database Setup

You'll need to make sure that Postgres and Redis are running in the background.

#### Postgres Setup

To set up your Postgres databases, you can run:

```
bun run dx:up
```

#### Executing Database Migrations

To execute the database migrations, run:

```sh
bun run db:migrate
```

To verify that the migration was executed successfully, connect to your Postgres
database and run:

```sh
\d
```

You should see a bunch of SQL tables!

#### Seeding the Database

Now that we have some tables, we're ready to add some seed data in our database,
which will enable you to log into the Admin Dashboard and Member Profile. Run:

```sh
bun run db:seed
```

Follow the prompt to add your email, and you will now be able to log into both
applications.

### Building the Project

You can build the project by running:

```sh
bun run build
```

### Running the Applications

To run all of our _applications_, you can run:

```sh
bun run dev:apps
```

To run a _specific package or application_, you can use the `--filter` flag like
this:

```sh
bun run dev --filter=api
```

### Logging Into Applications

In the development environment, you can bypass any real authentication when
logging into the Member Profile and Admin Dashboard by doing the following:

1. Click "Log In with OTP".
2. Input the email that you seeded your database with.
3. Input any 6-digit value.

You should be logged in!

### Enabling Integrations

To enable any of our 3rd party integrations in development, please see the
[How to Enable Integrations](./docs/how-to-enable-integrations.md)
documentation.

To enable sending emails, please see the
[How to Enable Emails](./docs/how-to-enable-emails.md) documentation.

### Editor Setup

Surprise, surprise. We use [VSCode](https://code.visualstudio.com/download) to
write code! After you download it, we recommend enabling some extensions to make
life a bit easier:

- [Auto Rename Tag](https://marketplace.visualstudio.com/items?itemName=formulahendry.auto-rename-tag)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Live Share](https://marketplace.visualstudio.com/items?itemName=MS-vsliveshare.vsliveshare)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Tailwind IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## Making a Pull Request

Some things to keep in mind when making a pull request:

- The target branch in our repository is `main`.
- Fill out the PR template accordingly.
- The name of the PR should:
  - Start with one of the following prefixes:
    - `feat`: A non-breaking change which adds functionality.
    - `fix`: A non-breaking change which fixes an issue.
    - `refactor`: A change that neither fixes a bug nor adds a feature.
    - `docs`: A change only to in-code or markdown documentation.
    - `test`: A change that adds missing tests.
    - `chore`: A change that is likely none of the above.
  - Be in all lowercase.
  - Start with a verb (ie: "add ...", "implement ...", "update ...").
  - Have an emoji at the end of it (we like color around here). 🔥
- Please check the
  ["allow edits from maintainers option"](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/allowing-changes-to-a-pull-request-branch-created-from-a-fork)
  when creating your PR. This allows us to more easily collaborate with you on
  your work.
- Most PRs should be attached to an issue, so be sure to add this to the PR
  description:
  ```
  Closes #<ISSUE_NUMBER>.
  ```
  See more about
  [linking a pull request to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue).
- A PR can only be merged (by a maintainer) if:
  - A maintainer has reviewed and approved it.
  - All CI checks have passed. See [this](./.github/workflows/ci.yml) workflow
    for more details.
  - All branches are up to date before merging.
  - All conversations are resolved.

### Your First PR

Getting your first PR in is always the hardest. Lucky for you, we love quick
wins here at ColorStack, so we're going to reduce that barrier for you! After
you finish your [local development](#local-development) setup, your first PR can
simply be updating the [`CONTRIBUTORS.yml`](./CONTRIBUTORS.yml) file with your
GitHub username!

You can name that PR:

```
chore: my first contribution ❤️
```

## Deciding What to Work On

You can start by browsing through our list of
[issues](https://github.com/colorstackorg/oyster/issues). Once you've decided on
an issue, leave a comment and wait to get approval from one of our codebase
admins - this helps avoid multiple people working on this same issue.

### Proposing Ideas

If you have a feature request or idea that would improve our product, please
start a discussion in our
[GitHub Discussions](https://github.com/colorstackorg/oyster/discussions) space!
If the maintainers see value in the idea, they will create issue from that
discussion.

## License

By contributing your code to the this GitHub repository, you agree to license
your contribution under the MIT license.
