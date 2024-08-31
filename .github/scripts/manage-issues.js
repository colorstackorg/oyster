export default async ({ github, context }) => {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  const botLogin = 'github-actions[bot]';

  const MAX_PAGES = 10; // Maximum number of pages to fetch for any paginated request
  const ITEMS_PER_PAGE = 100; // Maximum items per page allowed by GitHub API

  try {
    const allIssues = await github.paginate(
      github.rest.issues.listForRepo,
      {
        owner: context.repo.owner,
        repo: context.repo.repo,
        state: 'open',
        per_page: ITEMS_PER_PAGE,
      },
      (response) => response.data
    );

    console.log(`Fetched ${allIssues.length} open issues`);

    const assignedIssues = allIssues.filter(
      (issue) => !issue.pull_request && issue.assignees.length > 0
    );
    console.log(`Processing ${assignedIssues.length} assigned issues`);

    for (const issue of assignedIssues) {
      console.log(`Processing issue #${issue.number}`);
      try {
        const linkedPRs = await github.paginate(
          github.rest.issues.listEventsForTimeline,
          {
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issue.number,
            per_page: ITEMS_PER_PAGE,
          },
          (response, done) => {
            if (response.data.length === 0) {
              done();
            }
            return response.data.filter(
              (event) => new Date(event.created_at) >= threeWeeksAgo
            );
          },
          { maxPages: MAX_PAGES }
        );

        console.log(
          `Fetched ${linkedPRs.length} events for issue #${issue.number}`
        );

        const hasOpenLinkedPR = linkedPRs.some(
          (event) =>
            event.event === 'cross-referenced' &&
            event.source &&
            event.source.type === 'issue' &&
            event.source.issue &&
            event.source.issue.pull_request &&
            event.source.issue.state === 'open'
        );

        if (hasOpenLinkedPR) {
          console.log(
            `Skipping issue #${issue.number} as it has an open linked PR`
          );
          continue;
        }

        const comments = await github.paginate(
          github.rest.issues.listComments,
          {
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issue.number,
            per_page: ITEMS_PER_PAGE,
          },
          (response) => response.data,
          { maxPages: MAX_PAGES }
        );

        const lastNonBotActivity = new Date(
          Math.max(
            ...comments
              .filter((comment) => comment.user.login !== botLogin)
              .map((comment) => new Date(comment.created_at)),
            new Date(issue.created_at)
          )
        );

        const warningAlreadyGiven = comments.some(
          (comment) =>
            comment.user.login === botLogin &&
            comment.body.includes('This issue has been inactive')
        );

        if (lastNonBotActivity < threeWeeksAgo) {
          console.log(
            `Unassigning issue #${issue.number} due to 3 weeks of inactivity`
          );
          await github.rest.issues.removeAssignees({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issue.number,
            assignees: issue.assignees.map((assignee) => assignee.login),
          });

          await github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issue.number,
            body: "This issue has been inactive for 3 weeks and has been unassigned. Feel free to pick it up again when you're ready to work on it.",
          });
        } else if (lastNonBotActivity < twoWeeksAgo && !warningAlreadyGiven) {
          console.log(
            `Warning on issue #${issue.number} due to 2 weeks of inactivity`
          );
          await github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issue.number,
            body: 'This issue has been inactive for 2 weeks. Please provide an update or it may be unassigned in 1 week.',
          });
        }
      } catch (error) {
        console.error(`Error processing issue #${issue.number}:`, error);
      }
    }
  } catch (error) {
    console.error('Error fetching issues:', error);
  }
};
