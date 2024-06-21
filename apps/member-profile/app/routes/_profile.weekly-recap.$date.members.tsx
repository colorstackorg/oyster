import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { generatePath, Link, useLoaderData } from '@remix-run/react';

import { ProfilePicture, Text } from '@oyster/ui';

import { listMembersInDirectory } from '@/member-profile.server';
import { getDateRange, Recap } from '@/routes/_profile.weekly-recap.$date';
import { Route } from '@/shared/constants';
import { useMixpanelTracker } from '@/shared/hooks/use-mixpanel-tracker';
import { ensureUserAuthenticated } from '@/shared/session.server';
import { formatName } from '@/shared/utils/format.utils';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const { endOfWeek, startOfWeek } = getDateRange(params.date);

  const { members } = await listMembersInDirectory({
    limit: 100,
    page: 1,
    where: {
      company: null,
      ethnicity: null,
      graduationYear: null,
      hometown: null,
      hometownLatitude: null,
      hometownLongitude: null,
      joinedDirectoryAfter: startOfWeek,
      joinedDirectoryBefore: endOfWeek,
      location: null,
      locationLatitude: null,
      locationLongitude: null,
      school: null,
      search: '',
    },
  });

  return json({
    members,
  });
}

export default function RecapMembers() {
  const { trackFromClient } = useMixpanelTracker();
  const { members } = useLoaderData<typeof loader>();

  return (
    <Recap>
      <Recap.Header>
        <Recap.Title>New Members 💼 ({members.length})</Recap.Title>
        <Recap.Description>
          Welcome all of the new members that joined the directory this week!
        </Recap.Description>
      </Recap.Header>

      <ul className="grid grid-cols-1 gap-2 overflow-auto @[800px]:grid-cols-2 @[1200px]:grid-cols-3">
        {members.map((member) => {
          return (
            <li>
              <Link
                className="grid grid-cols-[3rem,1fr] items-center gap-4 rounded-2xl p-2 hover:bg-gray-100 sm:grid-cols-[4rem,1fr]"
                onClick={() => {
                  trackFromClient({
                    event: 'Directory - Profile Clicked',
                    properties: undefined,
                  });
                }}
                to={generatePath(Route['/directory/:id'], { id: member.id })}
              >
                <ProfilePicture
                  initials={member.firstName[0] + member.lastName[0]}
                  src={member.profilePicture || undefined}
                  size="64"
                />

                <div>
                  <Text variant="xl">
                    {formatName({
                      firstName: member.firstName,
                      lastName: member.lastName,
                      preferredName: member.preferredName,
                    })}
                  </Text>

                  <Text className="line-clamp-2" color="gray-500" variant="sm">
                    {member.headline}
                  </Text>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Recap>
  );
}
