import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { Clock } from 'react-feather';
import { CheckCircle } from 'react-feather';

import { db } from '@oyster/db';
import {
  ErrorMessage,
  getErrors,
  Text,
  useRevalidateOnFocus,
  useRevalidateOnInterval,
} from '@oyster/ui';

import {
  BackButton,
  ContinueButton,
  OnboardingButtonGroup,
  SectionDescription,
  SectionTitle,
} from '@/routes/onboarding';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const member = await db
    .selectFrom('students')
    .select(['joinedSlackAt'])
    .where('id', '=', user(session))
    .executeTakeFirst();

  return json({ joinedSlack: !!member?.joinedSlackAt });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await db
    .updateTable('students')
    .set({ onboardedAt: new Date() })
    .where('id', '=', user(session))
    .execute();

  const url = new URL(request.url);

  url.pathname = Route['/home'];
  url.searchParams.set('new', '1');

  return redirect(url.toString());
}

export default function SlackForm() {
  const { joinedSlack } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error } = getErrors(actionData);

  useRevalidateOnFocus();
  useRevalidateOnInterval(2500);

  return (
    <Form className="form" method="post">
      <SectionTitle>Slack</SectionTitle>

      <SectionDescription>
        We just invited you to join our Slack workspace! Please check your email
        for the invitation. When you accept the invitation, you will be done
        with the onboarding process.
      </SectionDescription>

      <div className="mt-4 flex items-center gap-2">
        <div className="w-full rounded-md bg-gray-50 p-4">
          {joinedSlack ? (
            <>
              <Text
                className="flex items-center gap-1"
                color="success"
                variant="sm"
              >
                <CheckCircle className="h-5 w-5" />
                Joined Slack Workspace
              </Text>
            </>
          ) : (
            <Text
              className="flex items-center gap-1"
              color="gray-500"
              variant="sm"
            >
              <Clock className="h-5 w-5" />
              Waiting for you to accept your Slack invitiation...
            </Text>
          )}
        </div>
      </div>

      <ErrorMessage>{error}</ErrorMessage>

      <OnboardingButtonGroup>
        <BackButton to="/onboarding/education" />
        <ContinueButton disabled={!joinedSlack} label="Finish" />
      </OnboardingButtonGroup>
    </Form>
  );
}
