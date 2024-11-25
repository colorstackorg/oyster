const BOT_LOGIN = 'github-actions[bot]';
const ITEMS_PER_PAGE = 100; // Max allowed by GitHub API is 100.

module.exports = async function manageIssues({ context, github }) {
  const issues = await github.paginate(
    github.rest.issues.listForRepo,
    {
      owner: context.repo.owner,
      per_page: ITEMS_PER_PAGE,
      repo: context.repo.repo,
      state: 'open',
    },
    ({ data: issues }) => {
      return issues.filter((issue) => {
        return !issue.pull_request && issue.assignees.length > 0;
      });
    }
  );

  console.log(`Processing ${issues.length} open issues.`);

  for (const issue of issues) {
    console.log(''); // Newline for readability.
    await processIssue({ context, github, issue });
  }
};

/**
 * Checks if an issue is stale and takes appropriate action.
 * - If the issue has been inactive for 3 weeks, it will be unassigned.
 * - If the issue has been inactive for 2 weeks, a warning message will be added.
 * - Otherwise, does nothing.
 *
 * @param {Object} issue - GitHub issue to check.
 */
async function processIssue({ context, github, issue }) {
  console.log(`Processing issue #${issue.number}.`);

  const now = Date.now();
  const oneDayInMs = 1000 * 60 * 60 * 24;
  const twoWeeksAgo = new Date(now - oneDayInMs * 14);
  const threeWeeksAgo = new Date(now - oneDayInMs * 21);

  const events = await github.paginate(
    github.rest.issues.listEventsForTimeline,
    {
      issue_number: issue.number,
      owner: context.repo.owner,
      per_page: ITEMS_PER_PAGE,
      repo: context.repo.repo,
    },
    ({ data: events }) => {
      return events;
    }
  );

  console.log(`Fetched ${events.length} events for issue #${issue.number}.`);

  const hasOpenPR = events.some((event) => {
    return (
      event.event === 'cross-referenced' &&
      event.source &&
      event.source.type === 'issue' &&
      event.source.issue &&
      event.source.issue.pull_request &&
      event.source.issue.state === 'open'
    );
  });

  if (hasOpenPR) {
    console.log(`Skipping issue #${issue.number} as it has an open PR.`);
    return;
  }

  const comments = await github.paginate(
    github.rest.issues.listComments,
    {
      issue_number: issue.number,
      owner: context.repo.owner,
      per_page: ITEMS_PER_PAGE,
      repo: context.repo.repo,
    },
    ({ data: comments }) => {
      return comments.filter((comment) => {
        return new Date(comment.created_at) >= threeWeeksAgo;
      });
    }
  );

  const lastActivity = new Date(
    Math.max(
      issue.created_at,
      ...comments
        .filter((comment) => comment.user.login !== BOT_LOGIN)
        .map((comment) => comment.created_at)
    )
  );

  if (lastActivity < threeWeeksAgo) {
    console.log(`Unassigning issue #${issue.number} due to inactivity.`);

    await github.rest.issues.removeAssignees({
      assignees: issue.assignees.map((assignee) => assignee.login),
      issue_number: issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
    });

    await github.rest.issues.createComment({
      body: "This issue has been inactive for 3 weeks and has been unassigned. Feel free to pick it up again when you're ready to work on it.",
      issue_number: issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
    });

    return;
  }

  const warningAlreadyGiven = comments.some((comment) => {
    return (
      comment.user.login === BOT_LOGIN &&
      comment.body.includes('This issue has been inactive')
    );
  });

  if (lastActivity < twoWeeksAgo && !warningAlreadyGiven) {
    console.log(`Warning issue #${issue.number} due to inactivity.`);

    await github.rest.issues.createComment({
      body: 'This issue has been inactive for 2 weeks. Please provide an update or it will be unassigned in 1 week.',
      issue_number: issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
    });

    return;
  }

  console.log(`Issue #${issue.number} is up to date.`);
}
