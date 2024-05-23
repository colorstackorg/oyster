import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  Form as RemixForm,
  useFetcher,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { ArrowUp, BarChart2, Edit, Plus, Share } from 'react-feather';
import { match } from 'ts-pattern';

import { getObjectPresignedUri } from '@oyster/infrastructure/object-storage';
import {
  cx,
  Dashboard,
  getButtonCn,
  getIconButtonCn,
  getTextCn,
  Pagination,
  Pill,
  ProfilePicture,
  Select,
  Text,
} from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';
import { iife } from '@oyster/utils';

import { listResources, listTags } from '@/member-profile.server';
import {
  ListResourcesOrderBy,
  ListResourcesWhere,
  ListSearchParams,
  ResourceType,
} from '@/member-profile.ui';
import { Route } from '@/shared/constants';
import { useToast } from '@/shared/hooks/use-toast';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const ResourcesSearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
})
  .merge(ListResourcesWhere)
  .extend({ orderBy: ListResourcesOrderBy });

const keys = ResourcesSearchParams.keyof().enum;

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = ResourcesSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    tags: url.searchParams.getAll('tags'),
  });

  const { resources: records, totalCount } = await listResources({
    limit: searchParams.limit,
    memberId: user(session),
    page: searchParams.page,
    orderBy: searchParams.orderBy,
    select: [
      'resources.description',
      'resources.id',
      'resources.link',
      'resources.postedAt',
      'resources.title',
      'resources.type',
      'students.firstName as authorFirstName',
      'students.id as authorId',
      'students.lastName as authorLastName',
      'students.profilePicture as authorProfilePicture',
    ],
    where: {
      id: searchParams.id,
      search: searchParams.search,
      tags: searchParams.tags,
    },
  });

  const resources = await Promise.all(
    records.map(
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
          attachments: await Promise.all(
            (attachments || [])
              .filter((attachment) => {
                return !!attachment.s3Key;
              })
              .map(async (attachment) => {
                return {
                  mimeType: attachment.mimeType,
                  uri: await getObjectPresignedUri({ key: attachment.s3Key }),
                };
              })
          ),
          editable: record.authorId === user(session),
          postedAt: dayjs().to(postedAt),
          shareableUri: `${url.protocol}://${url.host}/resources?id=${record.id}`,
          tags: tags!,
          upvotes: Number(upvotes),
          upvoted: Boolean(upvoted),
          views: Number(views),
        };
      }
    )
  );

  const tags = await iife(async () => {
    const result: { id: string; name: string; param: string }[] = [];

    if (searchParams.id && resources[0]) {
      result.push({
        id: searchParams.id,
        name: resources[0].title as string,
        param: keys.id,
      });
    }

    if (searchParams.tags.length) {
      const tags = await listTags({
        limit: 100,
        page: 1,
        select: ['tags.id', 'tags.name'],
        where: { ids: searchParams.tags },
      });

      tags.forEach((tag) => {
        result.push({
          ...tag,
          param: keys.tags,
        });
      });
    }

    return result;
  });

  return json({
    limit: searchParams.limit,
    orderBy: searchParams.orderBy,
    page: searchParams.page,
    resources,
    tags,
    totalCount,
  });
}

export default function ResourcesPage() {
  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <Text variant="2xl">Resources 📚</Text>

        <Link className={getButtonCn({})} to={Route['/resources/add']}>
          <Plus size={16} /> Add Resource
        </Link>
      </header>

      <section className="flex gap-4">
        <Dashboard.SearchForm placeholder="Search by title..." />
        <SortResourcesForm />
      </section>

      <CurrentTagsList />
      <ResourcesList />
      <ResourcesPagination />
      <Outlet />
    </>
  );
}

function SortResourcesForm() {
  const { orderBy } = useLoaderData<typeof loader>();

  const submit = useSubmit();

  const sortKeys = ListResourcesOrderBy._def.innerType.enum;

  return (
    <RemixForm
      className="flex min-w-[12rem] items-center gap-4"
      method="get"
      onChange={(e) => submit(e.currentTarget)}
    >
      <Select
        defaultValue={orderBy}
        name={keys.orderBy}
        id={keys.orderBy}
        placeholder="Sort By..."
        required
      >
        <option value={sortKeys.newest}>Newest</option>
        <option value={sortKeys.most_upvotes}>Most Upvotes</option>
      </Select>
    </RemixForm>
  );
}

function CurrentTagsList() {
  const { tags } = useLoaderData<typeof loader>();
  const [_searchParams] = useSearchParams();

  if (!tags.length) {
    return null;
  }

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => {
        const searchParams = new URLSearchParams(_searchParams);

        searchParams.delete(tag.param, tag.id);

        return (
          <li key={tag.id}>
            <Pill
              color="pink-100"
              onCloseHref={{ search: searchParams.toString() }}
            >
              {tag.name}
            </Pill>
          </li>
        );
      })}
    </ul>
  );
}

function ResourcesPagination() {
  const { limit, resources, page, totalCount } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={resources.length}
      page={page}
      pageSize={limit}
      totalCount={totalCount}
    />
  );
}

// List

function ResourcesList() {
  const { resources } = useLoaderData<typeof loader>();

  if (!resources.length) {
    return (
      <div className="mt-4">
        <Text color="gray-500">There were no resources found.</Text>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 @[800px]:grid-cols-2 @[1200px]:grid-cols-3 @[1600px]:grid-cols-4">
      {resources.map((resource) => {
        return <ResourceItem key={resource.id} resource={resource} />;
      })}
    </ul>
  );
}

type ResourceInView = SerializeFrom<typeof loader>['resources'][number];

function ResourceItem({ resource }: { resource: ResourceInView }) {
  return (
    <li className="flex flex-col gap-3 rounded-3xl border border-gray-200 p-4">
      <header className="flex justify-between gap-2">
        <ResourceTitle
          attachments={resource.attachments}
          id={resource.id}
          link={resource.link}
          title={resource.title}
          type={resource.type}
        />
        <UpvoteResourceButton
          id={resource.id}
          upvoted={resource.upvoted}
          upvotes={resource.upvotes}
        />
      </header>

      <Text className="line-clamp-2" color="gray-500" variant="sm">
        {resource.description}
      </Text>

      <ResourceTagList tags={resource.tags} />

      <footer className="mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <ResourceAuthor
            authorFirstName={resource.authorFirstName}
            authorId={resource.authorId}
            authorLastName={resource.authorLastName}
            authorProfilePicture={resource.authorProfilePicture}
          />

          <Text color="gray-500" variant="sm">
            &bull;
          </Text>

          <Text color="gray-500" variant="sm">
            {resource.postedAt}
          </Text>

          <Text color="gray-500" variant="sm">
            &bull;
          </Text>

          <Text
            className="flex items-center gap-1"
            color="gray-500"
            variant="sm"
          >
            <BarChart2 size="16" />
            <span>{resource.views}</span>
          </Text>
        </div>

        <ResourceActionGroup
          editable={resource.editable}
          id={resource.id}
          shareableUri={resource.shareableUri}
        />
      </footer>
    </li>
  );
}

function ResourceTitle({
  attachments,
  id,
  link,
  title,
  type,
}: Pick<ResourceInView, 'attachments' | 'id' | 'link' | 'title' | 'type'>) {
  const fetcher = useFetcher();

  const [attachment] = attachments;

  const formattedType = match(type as ResourceType)
    .with('file', () => {
      return attachment.mimeType.slice(
        attachment.mimeType.lastIndexOf('/') + 1
      );
    })
    .with('url', () => 'URL')
    .exhaustive();

  return (
    <div>
      <Link
        className={cx(
          getTextCn({ variant: 'xl' }),
          'hover:text-primary hover:underline'
        )}
        onClick={() => {
          fetcher.submit(null, {
            action: `/api/resources/${id}/view`,
            method: 'post',
          });
        }}
        target="_blank"
        to={type === ResourceType.URL ? link! : attachment.uri}
      >
        {title}
      </Link>

      <span
        className={getTextCn({
          className: 'ml-2 uppercase',
          color: 'gray-500',
          variant: 'xs',
          weight: '600',
        })}
      >
        {formattedType}
      </span>
    </div>
  );
}

function UpvoteResourceButton({
  id,
  upvoted,
  upvotes,
}: Pick<ResourceInView, 'id' | 'upvoted' | 'upvotes'>) {
  const fetcher = useFetcher();

  const action = upvoted
    ? `/api/resources/${id}/downvote`
    : `/api/resources/${id}/upvote`;

  return (
    <fetcher.Form action={action} method="post">
      <button
        className={cx(
          getTextCn({ color: 'gray-500', variant: 'sm' }),
          'flex h-fit items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5',
          upvoted
            ? 'border-primary bg-primary text-white'
            : 'hover:border-primary hover:text-primary'
        )}
        type="submit"
      >
        <ArrowUp size="16" /> <span>{upvotes}</span>
      </button>
    </fetcher.Form>
  );
}

function ResourceTagList({ tags }: Pick<ResourceInView, 'tags'>) {
  const [_searchParams] = useSearchParams();

  return (
    <ul className="mb-2 flex flex-wrap items-center gap-1">
      {tags.map((tag) => {
        const searchParams = new URLSearchParams(_searchParams);

        if (!searchParams.getAll('tags').includes(tag.id)) {
          searchParams.append('tags', tag.id);
        }

        return (
          <Pill
            color="pink-100"
            key={tag.id}
            to={{ search: searchParams.toString() }}
          >
            {tag.name}
          </Pill>
        );
      })}
    </ul>
  );
}

function ResourceAuthor({
  authorFirstName: firstName,
  authorId: id,
  authorLastName: lastName,
  authorProfilePicture: profilePicture,
}: Pick<
  ResourceInView,
  'authorFirstName' | 'authorId' | 'authorLastName' | 'authorProfilePicture'
>) {
  return (
    <div className="flex w-fit items-center gap-2">
      <ProfilePicture
        initials={firstName![0] + lastName![0]}
        size="32"
        src={profilePicture || undefined}
      />

      <Link
        className={cx(
          getTextCn({ color: 'gray-500', variant: 'sm' }),
          'hover:underline'
        )}
        to={generatePath(Route['/directory/:id'], { id })}
      >
        {firstName} {lastName}
      </Link>
    </div>
  );
}

function ResourceActionGroup({
  editable,
  id,
  shareableUri,
}: Pick<ResourceInView, 'editable' | 'id' | 'shareableUri'>) {
  const toast = useToast();

  const buttonClassName = getIconButtonCn({
    backgroundColor: 'gray-100',
    backgroundColorOnHover: 'gray-200',
  });

  return (
    <ul className="flex items-center gap-1">
      {!!editable && (
        <li>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                className={buttonClassName}
                to={generatePath(Route['/resources/:id/edit'], { id })}
              >
                <Edit />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <TooltipText>Edit Resource</TooltipText>
            </TooltipContent>
          </Tooltip>
        </li>
      )}

      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={buttonClassName}
              onClick={() => {
                navigator.clipboard.writeText(shareableUri);
                toast({ message: 'Copied URL to clipboard!' });
              }}
              type="button"
            >
              <Share />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <TooltipText>Copy Resource Link</TooltipText>
          </TooltipContent>
        </Tooltip>
      </li>
    </ul>
  );
}
