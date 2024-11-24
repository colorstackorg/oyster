import {
  generatePath,
  Link,
  useFetcher,
  useSearchParams,
} from '@remix-run/react';
import { type PropsWithChildren, useState } from 'react';
import {
  ArrowUp,
  BarChart2,
  Edit,
  MoreHorizontal,
  Share,
  Trash2,
} from 'react-feather';
import { match } from 'ts-pattern';

import { ResourceType } from '@oyster/core/resources';
import {
  cx,
  Dropdown,
  getIconButtonCn,
  getTextCn,
  IconButton,
  Pill,
  ProfilePicture,
  Text,
} from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';

import { Route } from '@/shared/constants';
import { useMixpanelTracker } from '@/shared/hooks/use-mixpanel-tracker';
import { useToast } from '@/shared/hooks/use-toast';

type ResourceProps = {
  attachments: { mimeType: string; uri: string }[];
  description: string;
  editable: boolean;
  id: string;
  link: string | null;
  postedAt: string;
  postedAtExpanded: string;
  posterFirstName: string;
  posterId: string;
  posterLastName: string;
  posterProfilePicture: string | null;
  shareableUri: string;
  tags: { id: string; name: string }[];
  title: string;
  type: ResourceType;
  upvoted: boolean;
  upvotes: number;
  views: number;
};

export const Resource = ({
  attachments,
  description,
  editable,
  id,
  link,
  postedAt,
  postedAtExpanded,
  posterFirstName,
  posterId,
  posterLastName,
  posterProfilePicture,
  shareableUri,
  tags,
  title,
  type,
  upvoted,
  upvotes,
  views,
}: ResourceProps) => {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4">
      <header className="flex justify-between gap-2">
        <ResourceTitle
          attachments={attachments}
          id={id}
          link={link}
          title={title}
          type={type}
        />
        <UpvoteResourceButton id={id} upvoted={upvoted} upvotes={upvotes} />
      </header>

      <Text color="gray-500" variant="sm">
        {description}
      </Text>

      <ResourceTagList tags={tags} />

      <footer className="mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <ResourcePoster
            posterFirstName={posterFirstName}
            posterId={posterId}
            posterLastName={posterLastName}
            posterProfilePicture={posterProfilePicture}
          />

          <Text color="gray-500" variant="sm">
            &bull;
          </Text>

          <Tooltip>
            <TooltipTrigger
              className={getTextCn({
                className: 'cursor-auto',
                color: 'gray-500',
                variant: 'sm',
              })}
            >
              {postedAt}
            </TooltipTrigger>
            <TooltipContent>
              <TooltipText>{postedAtExpanded}</TooltipText>
            </TooltipContent>
          </Tooltip>

          <Text color="gray-500" variant="sm">
            &bull;
          </Text>

          <Text
            className="flex items-center gap-1"
            color="gray-500"
            variant="sm"
          >
            <BarChart2 size="16" />
            <span>{views}</span>
          </Text>
        </div>

        <ResourceActionGroup
          editable={editable}
          id={id}
          shareableUri={shareableUri}
        />
      </footer>
    </li>
  );
};

function ResourceTitle({
  attachments,
  id,
  link,
  title,
  type,
}: Pick<ResourceProps, 'attachments' | 'id' | 'link' | 'title' | 'type'>) {
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
}: Pick<ResourceProps, 'id' | 'upvoted' | 'upvotes'>) {
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

function ResourceTagList({ tags }: Pick<ResourceProps, 'tags'>) {
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

function ResourcePoster({
  posterFirstName: firstName,
  posterId: id,
  posterLastName: lastName,
  posterProfilePicture: profilePicture,
}: Pick<
  ResourceProps,
  'posterFirstName' | 'posterId' | 'posterLastName' | 'posterProfilePicture'
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
}: Pick<ResourceProps, 'editable' | 'id' | 'shareableUri'>) {
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState<boolean>(false);
  const toast = useToast();
  const { trackFromClient } = useMixpanelTracker();

  const buttonClassName = getIconButtonCn({
    backgroundColor: 'gray-100',
    backgroundColorOnHover: 'gray-200',
  });

  function onClick() {
    setOpen(true);
  }

  return (
    <ul className="flex items-center gap-1">
      {!!editable && (
        <li>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                className={buttonClassName}
                to={{
                  pathname: generatePath(Route['/resources/:id/edit'], { id }),
                  search: searchParams.toString(),
                }}
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
      {editable ? (
        <li>
          <Dropdown.Container onClose={() => setOpen(false)}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={buttonClassName}
                  onClick={onClick}
                  type="button"
                >
                  <MoreHorizontal />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <TooltipText>More Options</TooltipText>
              </TooltipContent>
            </Tooltip>

            {open && (
              <Dropdown>
                <Dropdown.List>
                  <Dropdown.Item>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareableUri);
                        toast({ message: 'Copied URL to clipboard!' });
                        trackFromClient({
                          event: 'Resource Link Copied',
                          properties: undefined,
                        });
                      }}
                      type="button"
                    >
                      <Share /> Copy Resource Link
                    </button>
                  </Dropdown.Item>
                  <Dropdown.Item>
                    <Link
                      to={{
                        pathname: generatePath(Route['/resources/:id/delete'], {
                          id,
                        }),
                        search: searchParams.toString(),
                      }}
                    >
                      <Trash2 /> Delete
                    </Link>
                  </Dropdown.Item>
                </Dropdown.List>
              </Dropdown>
            )}
          </Dropdown.Container>
        </li>
      ) : (
        <li>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={buttonClassName}
                onClick={() => {
                  navigator.clipboard.writeText(shareableUri);
                  toast({ message: 'Copied URL to clipboard!' });
                  trackFromClient({
                    event: 'Resource Link Copied',
                    properties: undefined,
                  });
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
      )}
    </ul>
  );
}

Resource.List = function List({ children }: PropsWithChildren) {
  return (
    <ul className="grid grid-cols-1 gap-2 @[800px]:grid-cols-2 @[1200px]:grid-cols-3 @[1600px]:grid-cols-4">
      {children}
    </ul>
  );
};
