import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';

import { type ResourceType } from '@oyster/core/resources';
import { listResources } from '@oyster/core/resources.server';
import { getPresignedURL } from '@oyster/infrastructure/object-storage';

import { getDateRange, RecapPage } from '@/routes/_profile.weekly-recap.$date';
import { Resource } from '@/shared/components/resource';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { endOfWeek, startOfWeek } = getDateRange(params.date);

  const { resources: _resources } = await listResources({
    memberId: user(session),
    orderBy: 'most_upvotes',
    pagination: {
      limit: 1000,
      page: 1,
    },
    select: [
      'resources.description',
      'resources.id',
      'resources.link',
      'resources.postedAt',
      'resources.title',
      'resources.type',
      'students.firstName as posterFirstName',
      'students.id as posterId',
      'students.lastName as posterLastName',
      'students.profilePicture as posterProfilePicture',
    ],
    where: {
      postedAfter: startOfWeek,
      postedBefore: endOfWeek,
      search: '',
      tags: [],
    },
  });

  const url = new URL(request.url);

  const resources = await Promise.all(
    _resources.map(
      async ({
        attachments,
        postedAt,
        tags,
        upvotes,
        upvoted,
        views,
        ...record
      }) => {
        return {
          ...record,

          // If there are any attachments, we need to generate a presigned URL
          // to the object in the Cloudflare R2 bucket.
          attachments: await Promise.all(
            (attachments || []).map(async (attachment) => {
              return {
                mimeType: attachment.mimeType,
                uri: await getPresignedURL({
                  expiresIn: 60 * 60, // 1 hour
                  key: attachment.s3Key,
                }),
              };
            })
          ),

          // If the logged-in member is the poster of the resource, they should
          // be able to edit the resource.
          editable: record.posterId === user(session),

          // This is a relative time of when the resource was posted,
          // ie: "2d" (2 days ago).
          postedAt: dayjs().to(postedAt),

          postedAtExpanded: dayjs(postedAt)
            .tz(getTimezone(request))
            .format('MMM DD, YYYY • h:mm A'),

          // This is the URL that can be shared with others to view the
          // resource. Note: This is a URL to our application, not the _actual_
          // resource URL (which has permissions via the presigned URL).
          shareableUri: `${url.protocol}//${url.host}/resources?id=${record.id}`,

          tags: tags!,
          upvotes: Number(upvotes),
          upvoted: Boolean(upvoted),
          views: Number(views),
        };
      }
    )
  );

  return json({
    resources,
  });
}

export default function ResourcesInWeek() {
  const { resources } = useLoaderData<typeof loader>();

  return (
    <RecapPage
      description="Helpful resources that were shared this week."
      title={`Resources 📚 (${resources.length})`}
    >
      <Resource.List>
        {resources.map((resource) => {
          return (
            <Resource
              key={resource.id}
              attachments={resource.attachments}
              // border={false}
              description={resource.description}
              editable={resource.editable}
              id={resource.id}
              link={resource.link}
              postedAt={resource.postedAt}
              postedAtExpanded={resource.postedAtExpanded}
              posterFirstName={resource.posterFirstName as string}
              posterId={resource.posterId as string}
              posterLastName={resource.posterLastName as string}
              posterProfilePicture={resource.posterProfilePicture}
              shareableUri={resource.shareableUri}
              tags={resource.tags}
              title={resource.title}
              type={resource.type as ResourceType}
              upvoted={resource.upvoted}
              upvotes={resource.upvotes}
              views={resource.views}
            />
          );
        })}
      </Resource.List>
    </RecapPage>
  );
}
