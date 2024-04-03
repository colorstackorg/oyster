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

## Your First PR

Getting your first PR in is always the hardest. We're going to reduce that
barrier for you! After you finish your local development setup (instructions
below), your first PR can simply be updating the
[`CONTRIBUTORS.yml`](./CONTRIBUTORS.yml) file with your GitHub username!

You can name that PR:

```
chore: my first contribution ❤️
```

## Deciding What to Work On

You can start by browsing through our list of
[issues](https://github.com/colorstackorg/oyster/issues) or creating your own
issue that would improve our product. Once you've decided on an issue, leave a
comment and wait to get approval from one of our codebase admins - this helps
avoid multiple people working on this same issue.

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

## Local Development

To get started with local development, please follow these simple steps.

### Prerequisites

Please ensure that you have the following software on your machine:

- [Node.js](https://nodejs.org/en/download/package-manager) (v20.x)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install) (v1)
- [PostgreSQL](https://www.postgresql.org/download/) (v15.x)
- [Redis](https://redis.io/docs/install/install-redis/)

### Fork and Clone Repository

1. [Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo)
   the repository to your own GitHub account.
2. [Clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
   the repository to your local machine.
   ```
   git clone https://github.com/<YOUR_USERNAME>/oyster.git
   ```
3. Create a new branch.
   ```
   git checkout -b YOUR_BRANCH_NAME
   ```
4. Install all project dependencies.

   ```sh
   yarn
   ```

### Syncing a Forked Repository

In order to keep your forked repository up to date with the upstream repository,
please read the following guides.

- [Configuring a Remote Repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/configuring-a-remote-repository-for-a-fork)
- [Syncing a Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)

### Environment Variables

Set up your environment variable files by doing the following:

- In `/apps/admin-dashboard`, duplicate the `.env.example` to `.env`.
- In `/apps/api`, duplicate the `.env.example` to `.env`.
- In `/apps/member-profile`, duplicate the `.env.example` to `.env`.
- In `/packages/core`, duplicate the `.env.test.example` to `.env.test`.
- In `/packages/db`, duplicate the `.env.example` to `.env`.

You'll notice that a lot of environment variables are empty. Most of these empty
variables are tied to the 3rd party integrations we have with platforms such as
Postmark for sending emails and Google for authentication. If you would like to
enable these integrations in development, please see the
[How to Enable Integrations](./docs/how-to-enable-integrations.md)
documentation.

### Database Setup

You'll need to make sure that Postgres and Redis are running in the background.

#### Postgres Setup

To set up your Postgres databases, you can run:

```
yarn db:setup
```

You should now be able to connect to your database like this:

```sh
psql colorstack -U colorstack
```

#### Executing Database Migrations

To execute the database migrations, run:

```sh
yarn db:migrate
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
yarn db:seed
```

Follow the prompt to add your email, and you will now be able to log into both
applications.

### Building the Project

You can build the project by running:

```sh
yarn build
```

### Running the Applications

To run all of our _applications_, you can run:

```sh
yarn dev:apps
```

To run a _specific package or application_, you can use the `--filter` flag like
this:

```sh
yarn dev --filter=api
```

### Logging Into Applications

You can log into the Member Profile and Admin Dashboard by sending a one-time
code to your email OR by using your Google login.

- [Recommended] To log in by sending a one-time code to your email, you'll first
  need to enable sending emails in development. See instructions on how to do so
  [here](./docs/how-to-enable-emails.md).
- To log in via Google, you'll first need to enable the **Google** integration.
  See instructions on how to do so
  [here](./docs/how-to-enable-integrations.md#google).

### Editor Setup

Surprise, surprise. We use [VSCode](https://code.visualstudio.com/download) to
write code! After you download it, we'll need to enable some extensions to make
life a bit easier:

- [Auto Rename Tag](https://marketplace.visualstudio.com/items?itemName=formulahendry.auto-rename-tag)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Live Share](https://marketplace.visualstudio.com/items?itemName=MS-vsliveshare.vsliveshare)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Tailwind IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Typescript Importer](https://marketplace.visualstudio.com/items?itemName=pmneo.tsimporter)

## License

By contributing your code to the this GitHub repository, you agree to license
your contribution under the MIT license.
