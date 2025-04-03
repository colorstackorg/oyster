import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useOutlet,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { ArrowDown, ArrowUp, Edit, User } from 'react-feather';

import { type HelpRequestStatus as HelpRequestStatusType } from '@oyster/core/peer-help';
import { db } from '@oyster/db';
import {
  Button,
  Divider,
  IconButton,
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

import {
  HelpRequestDescription,
  HelpRequestStatus,
  HelpRequestType,
} from '@/shared/components/peer-help';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

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
      (eb) => {
        return eb('helpeeId', '=', memberId).as('isHelpee');
      },
    ])
    .where('helpRequests.id', '=', params.id as string)
    .executeTakeFirst();

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
    status: helpRequest.status as HelpRequestStatusType,
  });
}

export default function HelpRequestModal() {
  const outlet = useOutlet();
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/peer-help'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Help Request</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <HelpRequestInformation />
      {outlet && <Divider />}
      <Outlet />
    </Modal>
  );
}

function HelpRequestInformation() {
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
    id,
    isHelpee,
    status,
    type,
  } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1">
        <HelpRequestType type={type} />
        <HelpRequestStatus status={status} />
      </div>

      <HelpRequestDescription>{description}</HelpRequestDescription>

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

        {status === 'requested' && (
          <>{isHelpee ? <EditButton id={id} /> : <OfferHelpToggle />}</>
        )}
      </footer>
    </div>
  );
}

type HelpRequestInView = SerializeFrom<typeof loader>;

function Helpee({
  helpeeFirstName: firstName,
  helpeeId: id,
  helpeeLastName: lastName,
  helpeeProfilePicture: profilePicture,
}: Pick<
  HelpRequestInView,
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
        to={generatePath(Route['/directory/:id'], { id: id || '' })}
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
}: Pick<HelpRequestInView, 'helperFirstName' | 'helperId' | 'helperLastName'>) {
  return (
    <div className="flex w-full items-center gap-1 rounded-lg bg-gray-50 p-2">
      <User className="text-gray-500" size={16} />
      <Text color="gray-500" variant="sm">
        Helper:
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

function EditButton({ id }: Pick<HelpRequestInView, 'id'>) {
  const [searchParams] = useSearchParams();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <IconButton.Slot
          backgroundColor="gray-100"
          backgroundColorOnHover="gray-200"
        >
          <Link
            to={{
              pathname: generatePath(Route['/peer-help/:id/edit'], { id }),
              search: searchParams.toString(),
            }}
            unstable_viewTransition
          >
            <Edit />
          </Link>
        </IconButton.Slot>
      </TooltipTrigger>

      <TooltipContent>
        <TooltipText>Edit Request</TooltipText>
      </TooltipContent>
    </Tooltip>
  );
}

function OfferHelpToggle() {
  const { id } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();

  const isOfferRoute = pathname.endsWith('/offer');

  if (isOfferRoute) {
    return (
      <Button.Slot variant="secondary">
        <Link
          to={generatePath(Route['/peer-help/:id'], { id })}
          unstable_viewTransition
        >
          Collapse <ArrowUp size={20} />
        </Link>
      </Button.Slot>
    );
  }

  return (
    <Button.Slot variant="primary">
      <Link
        to={generatePath(Route['/peer-help/:id/offer'], { id })}
        unstable_viewTransition
      >
        Offer Help <ArrowDown size={20} />
      </Link>
    </Button.Slot>
  );
}
