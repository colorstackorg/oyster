import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  Link,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import { type PropsWithChildren } from 'react';
import { Check } from 'react-feather';

import { offerHelp } from '@oyster/core/peer-help';
import { getColorStackBotDeepLink } from '@oyster/core/slack/utils';
import { Button, ErrorMessage, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const slackLink = await getColorStackBotDeepLink();

  return json({ slackLink });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = params.id as string;

  const result = await offerHelp(id, {
    memberId: user(session),
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'You have accepted the help request!',
  });

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/peer-help/:id'], { id });

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function OfferHelp() {
  const actionData = useActionData<typeof action>();

  return (
    <section className="flex flex-col gap-[inherit]">
      <NextStepsSection />
      <HelpAgreementSection />

      <Form className="form" method="post">
        <ErrorMessage>{actionData?.error}</ErrorMessage>

        <Button.Group flexDirection="row-reverse">
          <Button.Submit>
            I Agree & Confirm <Check size={20} />
          </Button.Submit>
        </Button.Group>
      </Form>
    </section>
  );
}

function NextStepsSection() {
  const { slackLink } = useLoaderData<typeof loader>();

  const link = (
    <Link className="link" target="_blank" to={slackLink}>
      ColorStack Slack Bot
    </Link>
  );

  return (
    <section className="flex flex-col gap-2">
      <Text weight="500">Next Steps</Text>

      <Text color="gray-500" variant="sm">
        If you confirm, the {link} will introduce you both via a Slack group DM.
        From there, you two can coordinate how to best fulfill the help request.
      </Text>
    </section>
  );
}

function HelpAgreementSection() {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <Text weight="500">Help Agreement</Text>

      <Text color="gray-500" variant="sm">
        By proceeding, I acknowledge and agree that:
      </Text>

      <ul className="-mt-1 ml-6 list-disc">
        <HelpAgreementItem>
          I have read the help request description in full.
        </HelpAgreementItem>

        <HelpAgreementItem>
          I am willing and able to help with this request to the best of my
          abilities.
        </HelpAgreementItem>

        <HelpAgreementItem>
          I am committed to helping ASAP and no later than 7 days from now.
        </HelpAgreementItem>

        <HelpAgreementItem>
          I will be prompt in my communication.
        </HelpAgreementItem>

        <HelpAgreementItem>
          I will be professional and respectful in my communication.
        </HelpAgreementItem>
      </ul>
    </section>
  );
}

function HelpAgreementItem({ children }: PropsWithChildren) {
  return (
    <li>
      <Text color="gray-500" variant="sm">
        {children}
      </Text>
    </li>
  );
}
