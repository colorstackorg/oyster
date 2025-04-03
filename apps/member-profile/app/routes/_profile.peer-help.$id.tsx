import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
  type SerializeFrom,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  Link,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { type PropsWithChildren } from 'react';
import { ArrowDown, ArrowUp, Check } from 'react-feather';
import { match } from 'ts-pattern';

import { acceptHelpRequest } from '@oyster/core/peer-help';
import { db } from '@oyster/db';
import {
  Button,
  cx,
  Divider,
  ErrorMessage,
  Modal,
  ProfilePicture,
  Text,
} from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';
import { run } from '@oyster/utils';

import {
  HelpRequestStatus,
  HelpRequestType,
} from '@/shared/components/peer-help';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const helpRequest = await db
    .selectFrom('helpRequests')
    .leftJoin('students as helpees', 'helpees.id', 'helpRequests.helpeeId')
    .leftJoin('students as helpers', 'helpers.id', 'helpRequests.helperId')
    .select([
      'helpees.firstName as helpeeFirstName',
      'helpees.lastName as helpeeLastName',
      'helpees.profilePicture as helpeeProfilePicture',
      'helpers.firstName as helperFirstName',
      'helpers.lastName as helperLastName',
      'helpRequests.createdAt',
      'helpRequests.description',
      'helpRequests.helpeeId',
      'helpRequests.helperId',
      'helpRequests.id',
      'helpRequests.status',
      'helpRequests.type',
    ])
    .where('helpRequests.id', '=', params.id as string)
    .executeTakeFirstOrThrow();

  if (!helpRequest) {
    throw new Response(null, {
      status: 404,
      statusText: 'The help request you are looking for does not exist.',
    });
  }

  const createdAtObject = dayjs(helpRequest.createdAt);

  return json({
    ...helpRequest,
    createdAt: createdAtObject.fromNow(),
    createdAtExpanded: createdAtObject.format('MMM DD, YYYY • h:mm A'),
    isMe: helpRequest.helpeeId === user(session),
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const helperId = user(session);

  const result = await acceptHelpRequest(params.id as string, { helperId });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'You have accepted the help request!',
  });

  const url = new URL(request.url);

  url.pathname = Route['/peer-help'];

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function HelpRequestModal() {
  const {
    createdAt,
    createdAtExpanded,
    description,
    helpeeFirstName,
    helpeeId,
    helpeeLastName,
    helpeeProfilePicture,
    helperFirstName,
    helperId,
    helperLastName,
    isMe,
    status,
    type,
  } = useLoaderData<typeof loader>();

  const [searchParams, setSearchParams] = useSearchParams();

  function toggleExpanded() {
    const params = new URLSearchParams(searchParams);

    if (params.get('expanded') === '1') {
      params.delete('expanded');
    } else {
      params.set('expanded', '1');
    }

    setSearchParams(params);
  }

  const expanded = searchParams.get('expanded') === '1';

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/peer-help'],
        search: run(() => {
          const newSearchParams = new URLSearchParams(searchParams);

          // When we close the modal, we reset the expanded state.
          newSearchParams.delete('expanded');

          return newSearchParams.toString();
        }),
      }}
    >
      <Modal.Header>
        <Modal.Title>Help Request</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1">
          <HelpRequestType type={type} />
          <HelpRequestStatus status={status} />
        </div>

        <Text
          className="border-l border-gray-300 pl-2"
          color="gray-500"
          variant="sm"
        >
          {description}
        </Text>

        {helperId && (
          <Helper
            helperFirstName={helperFirstName}
            helperId={helperId}
            helperLastName={helperLastName}
          />
        )}

        <footer className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <Helpee
              helpeeFirstName={helpeeFirstName}
              helpeeId={helpeeId}
              helpeeLastName={helpeeLastName}
              helpeeProfilePicture={helpeeProfilePicture}
            />

            <Text color="gray-500" variant="sm">
              &bull;
            </Text>

            <Tooltip>
              <TooltipTrigger className="cursor-auto text-sm text-gray-500">
                {createdAt}
              </TooltipTrigger>
              <TooltipContent>
                <TooltipText>{createdAtExpanded}</TooltipText>
              </TooltipContent>
            </Tooltip>
          </div>

          {!isMe && status === 'open' && (
            <OfferHelpToggle
              expanded={expanded}
              toggleExpanded={toggleExpanded}
            />
          )}
        </footer>

        <OfferHelpSection expanded={expanded} />
      </div>
    </Modal>
  );
}

type HelpRequest = SerializeFrom<typeof loader>;

function Helpee({
  helpeeFirstName: firstName,
  helpeeId: id,
  helpeeLastName: lastName,
  helpeeProfilePicture: profilePicture,
}: Pick<
  HelpRequest,
  'helpeeFirstName' | 'helpeeId' | 'helpeeLastName' | 'helpeeProfilePicture'
>) {
  return (
    <div className="flex w-fit items-center gap-2">
      <ProfilePicture
        initials={firstName![0] + lastName![0]}
        size="32"
        src={profilePicture || undefined}
      />

      <Link
        className="text-sm text-gray-500 hover:underline"
        target="_blank"
        to={generatePath(Route['/directory/:id'], { id })}
      >
        {firstName} {lastName}
      </Link>
    </div>
  );
}

function Helper({
  helperFirstName: firstName,
  helperId: id,
  helperLastName: lastName,
}: Pick<HelpRequest, 'helperFirstName' | 'helperId' | 'helperLastName'>) {
  return (
    <div className="flex w-full items-center gap-1 rounded-lg bg-gray-50 p-2">
      <Text color="gray-500" variant="sm">
        {match(status)
          .with('pending', () => 'Helping...')
          .with('complete', () => 'Helped!')
          .with('incomplete', () => 'Help Not Received')
          .otherwise(() => 'Helped by')}
      </Text>

      <Link
        className="link text-sm hover:underline"
        target="_blank"
        to={generatePath(Route['/directory/:id'], { id })}
      >
        {firstName} {lastName}
      </Link>
    </div>
  );
}

// Offer Help

type OfferHelpButtonProps = {
  expanded: boolean;
  toggleExpanded(): void;
};

function OfferHelpToggle({ expanded, toggleExpanded }: OfferHelpButtonProps) {
  if (expanded) {
    return (
      <Button onClick={toggleExpanded} variant="secondary">
        Collapse <ArrowUp size={20} />
      </Button>
    );
  }

  return (
    <Button onClick={toggleExpanded} variant="primary">
      Offer Help <ArrowDown size={20} />
    </Button>
  );
}

type OfferHelpSectionProps = {
  expanded: boolean;
};

function OfferHelpSection({ expanded }: OfferHelpSectionProps) {
  const actionData = useActionData<typeof action>();

  return (
    <section
      className={cx(
        'flex flex-col gap-[inherit]',
        'transition-all duration-500 ease-in-out',
        expanded ? 'max-h-[1000px] opacity-100' : '-mt-4 max-h-0 opacity-0'
      )}
    >
      <Divider />

      <NextStepsSubsection />
      <HelpAgreementSubsection />

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

function NextStepsSubsection() {
  const link = (
    <Link className="link" target="_blank" to="https://colorstack.slack.com">
      ColorStack Slack Bot
    </Link>
  );

  return (
    <div className="flex flex-col gap-2">
      <Text weight="500">Next Steps</Text>

      <Text color="gray-500" variant="sm">
        If you confirm, the {link} will introduce you to NAME HERE by sending a
        group DM to you both. From there, you two can coordinate your help
        session.
      </Text>
    </div>
  );
}

function HelpAgreementSubsection() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
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
          I will be responsive when coordinating with the requestor.
        </HelpAgreementItem>

        <HelpAgreementItem>
          I will maintain professionalism and respect when communicating with
          the requestor.
        </HelpAgreementItem>
      </ul>
    </div>
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
