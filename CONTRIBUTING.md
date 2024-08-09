# Contributing

First off, thank you for taking the time to contribute! 🥳 ColorStack is nothing
without its community and that certainly extends to the software that we build.
This is a big team effort!

## First Things First

The #1 reason that we decided to open source Oyster was so that ColorStack
members can learn from and eventually contribute to a real-world production
codebase. Everything we do is centered around our helping our members fulfuill
their dreams of becoming software engineers. That being said, in order to make
space for our community, we will only accept contributions from ColorStack
members. ❤️

## Table of Contents

- [Getting Started](#getting-started)
- [Your First PR](#your-first-pr)
- [Deciding What to Work On](#deciding-what-to-work-on)
- [Making a Pull Request](#making-a-pull-request)
- [Enabling Integrations](#enabling-integrations)
- [License](#license)

## Getting Started

Follow these steps in order to get started with contributing to Oyster!

1. Install [Docker Desktop](https://docs.docker.com/engine/install).

2. Install [Node.js](https://nodejs.org/en/download/package-manager) (v20.x).

   1. [Optional] Our recommendation is to use [`nvm`](https://nvm.sh) to install
      Node. The main benefit of `nvm` is that it allows you to quickly install
      and use different versions of Node on your machine.
   2. [Optional] If you choose to install Node.js with `nvm`, we would also
      recommend setting up a
      [shell integration](https://github.com/nvm-sh/nvm/blob/master/README.md#deeper-shell-integration),
      which will automatically install the right Node version for any project
      that you're working in, as long as there is a [`.nvmrc`](./.nvmrc) file
      found in that directory.
   3. [Optional] If you choose to install Node.js with `nvm` but don't want to
      set up a shell integration, you can switch to the appropriate Node version
      manually by doing:

      ```sh
      nvm install && nvm use
      ```

3. Install [Yarn](https://classic.yarnpkg.com/lang/en/docs/install) (v1).

   ```
   npm install --global yarn
   ```

4. [Fork the repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo)
   to your own GitHub account.

5. [Clone the repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
   to your local machine.

   ```
   git clone https://github.com/<YOUR_USERNAME>/oyster.git
   ```

6. Open the project in the editor of your choice and install all of our
   [Recommend Extensions](https://code.visualstudio.com/docs/editor/extension-marketplace#_recommended-extensions).
   You should see a popup to do this in VSCode the first time you open the
   project!

7. [Configure the upstream repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/configuring-a-remote-repository-for-a-fork),
   which will help you with
   [syncing your fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)
   with the Oyster codebase as new code is added to it in the future.

   ```
   git remote add upstream https://github.com/colorstackorg/oyster.git
   ```

8. Create a new branch.

   ```
   git checkout -b first-contribution
   ```

9. Install all project dependencies:

   ```sh
   yarn
   ```

10. Set up your environment variables:

    ```
     yarn env:setup
    ```

    You'll now have `.env` files in all of your apps (and a couple packages)!

    You'll also notice that a lot of environment variables are empty. Most of
    these empty variables are tied to the 3rd party integrations we have with
    services such as Google for authentication. You shouldn't need to enable
    these integrations unless you're working on a feature that touches that
    service, but in case you need to enable an integration, please see the
    [How to Enable Integrations](./docs/how-to-enable-integrations.md)
    documentation.

11. Start your Postgres database and Redis store:

    ```
    yarn dx:up
    ```

12. Run all the database migrations:

    ```sh
    yarn db:migrate
    ```

13. Seed your database with some "dummy" data:

    ```sh
    yarn db:seed
    ```

    Be sure to follow the prompt to add your email to the database.

    This will enable you to log into both the Admin Dashboard and Member Profile
    very soon!

14. Build the project:

    ```sh
    yarn build
    ```

15. Start all of the applications in development:

    ```sh
    yarn dev:apps
    ```

16. Open up the applications in the browser.

    1. The Member Profile is running at http://localhost:3000.
    2. The Admin Dashboard is running at http://localhost:3001.

17. Log into both applications. In the development environment, you can bypass
    the "real" authentication by doing the following:

    1. Click "Log In with OTP".
    2. Input the email that you seeded your database with.
    3. Input any 6-digit value (ie: 000000).

    You should be logged in!

18. Set up [Prisma Studio](https://www.prisma.io/studio), a tool to make it
    easier to interact with and manage your data in the browser:

    ```sh
    yarn prisma:setup # Generates a Prisma schema file...
    yarn prisma:studio # Starts Prisma Studio locally...
    ```

    You can now open up Prisma Studio in your browser at http://localhost:5555.

19. [Optional] Once you are done developing, you may want to stop the database
    containers since they can eat up battery life.

    ```sh
    yarn dx:down
    ```

That's it -- you've finished setting up Oyster locally! All your applications
are running properly and you're ready to get your first contribution in!

## Your First PR

It's time to get your first pull request in! We love quick wins, so this first
one should only take a few minutes. Here's what we want you to do:

1. Add your GitHub username to the [`CONTRIBUTORS.yml`](./CONTRIBUTORS.yml)
   file.
2. Push this change up to GitHub (ie: `git add`, `git commit`, `git push`).
3. Create a pull request.
   1. The title can be: `chore: my first contribution 🚀`
   2. The description can be: `Added name to CONTRIBUTORS.yml!`
4. Here is an [example PR](https://github.com/colorstackorg/oyster/pull/417) in
   case you want to follow one!

Boom, you're all done! This should be approved and merged soon, and you'll
officially be an Oyster contributor! 🥳

## Deciding What to Work On

You can start by browsing through our list of
[issues](https://github.com/colorstackorg/oyster/issues). Once you've decided on
an issue, leave a comment and wait to get approval from one of our codebase
admins - this helps avoid multiple people working on this same issue.

Most of our work comes from our
[product roadmap](https://github.com/orgs/colorstackorg/projects/4) so if
there's something that interests you there that hasn't been converted into an
issue yet, feel free to ask about it.

### Proposing Ideas

If you have a feature request or idea that would improve our product, please
start a thread in our
[`#oyster`](https://colorstack-family.slack.com/channels/C06S0DBFD6X) channel in
Slack! If the maintainers see value in the idea, they will add it to our
[product roadmap](https://github.com/orgs/colorstackorg/projects/4) or create an
[issue](https://github.com/colorstackorg/oyster/issues) directly.

### Reporting Bugs

If you find a bug, please file a
[bug report](https://github.com/colorstackorg/oyster/issues/new?assignees=&labels=Bug+%F0%9F%90%9E&projects=&template=bug_report.md&title=)
directly!

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

### Enabling Integrations

- To enable any of our 3rd party integrations in development, please see the
  [How to Enable Integrations](./docs/how-to-enable-integrations.md)
  documentation.
- To enable sending emails, please see the
  [How to Enable Emails](./docs/how-to-enable-emails.md) documentation.

## License

By contributing your code to the this GitHub repository, you agree to license
your contribution under the MIT license.
