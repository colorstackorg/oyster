import {
  type ActionFunctionArgs,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';

import { job } from '@oyster/core/bull';
import { db } from '@oyster/db';
import { ErrorMessage, getErrors } from '@oyster/ui';

import {
  OnboardingBackButton,
  OnboardingButtonGroup,
  OnboardingContinueButton,
  OnboardingSectionDescription,
  OnboardingSectionTitle,
} from '@/routes/onboarding';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const member = await db
    .selectFrom('students')
    .select('email')
    .where('id', '=', user(session))
    .executeTakeFirstOrThrow();

  return {
    email: member.email,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const member = await db
    .updateTable('students')
    .set({ onboardedAt: new Date() })
    .where('id', '=', user(session))
    .returning(['email', 'slackId'])
    .executeTakeFirst();

  if (member && !member.slackId) {
    job('slack.invite', { email: member.email });
  }

  const url = new URL(request.url);

  url.pathname = Route['/home'];
  url.searchParams.set('new', '1');

  return redirect(url.toString());
}

export default function OnboardingSlackForm() {
  const { email } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error } = getErrors(actionData);

  return (
    <Form className="form" method="post">
      <OnboardingSectionTitle>Slack</OnboardingSectionTitle>

      <OnboardingSectionDescription>
        After you click "Finish", we'll send you a Slack invitation to your
        email, <span className="font-bold">{email}</span>. Be sure to accept
        that invitation right after you check out your Member Profile! 🎉
      </OnboardingSectionDescription>

      <ErrorMessage>{error}</ErrorMessage>

      <OnboardingButtonGroup>
        <OnboardingBackButton to="/onboarding/community" />
        <OnboardingContinueButton label="Finish" />
      </OnboardingButtonGroup>
    </Form>
  );
}
