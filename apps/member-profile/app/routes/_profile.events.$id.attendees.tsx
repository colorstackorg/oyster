import {
  generatePath,
  Link,
  type LoaderFunctionArgs,
  useLoaderData,
} from 'react-router';

import {
  countEventAttendees,
  listEventAttendees,
} from '@oyster/core/events/attendees';
import { type Student } from '@oyster/types';
import { Modal, ProfilePicture } from '@oyster/ui';

import { Route } from '@/shared/constants';

export async function loader({ params }: LoaderFunctionArgs) {
  const eventId = params.id as string;

  const [attendees, attendeesCount] = await Promise.all([
    listEventAttendees({ eventId }),
    countEventAttendees({ eventId }),
  ]);

  return {
    attendees,
    attendeesCount,
  };
}

export default function EventAttendeesPage() {
  const { attendees, attendeesCount } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/events']}>
      <Modal.Header>
        <Modal.Title>Attendees List ({attendeesCount})</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <ul className="flex flex-col">
        {attendees.map((attendee) => {
          return (
            <li key={attendee.id}>
              <AttendeeItem
                firstName={attendee.firstName || ''}
                lastName={attendee.lastName || ''}
                id={attendee.id || ''}
                profilePicture={attendee.profilePicture}
              />
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

type AttendeeItemProps = Pick<
  Student,
  'firstName' | 'id' | 'lastName' | 'profilePicture'
>;

function AttendeeItem({
  firstName,
  id,
  lastName,
  profilePicture,
}: AttendeeItemProps) {
  return (
    <Link
      className="line-clamp-1 grid grid-cols-[3rem_1fr] items-center gap-2 rounded-2xl p-2 hover:bg-gray-100"
      to={generatePath(Route['/directory/:id'], { id })}
    >
      <ProfilePicture
        initials={firstName[0] + lastName[0]}
        src={profilePicture || undefined}
      />
      <span>
        {firstName} {lastName}
      </span>
    </Link>
  );
}
