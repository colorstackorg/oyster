import {
  type ActionFunctionArgs,
  unstable_composeUploadHandlers as composeUploadHandlers,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
  unstable_parseMultipartFormData as parseMultipartFormData,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { type PropsWithChildren } from 'react';
import { FileText } from 'react-feather';
import { match } from 'ts-pattern';

import { buildMeta } from '@oyster/core/remix';
import {
  getLastResumeFeedback,
  type ResumeFeedback,
  reviewResume,
} from '@oyster/core/resumes';
import { Button, cx, FileUploader, Form, MB_IN_BYTES, Text } from '@oyster/ui';
import { Progress, useProgress } from '@oyster/ui/progress';

import {
  EmptyState,
  EmptyStateContainer,
  EmptyStateDescription,
} from '@/shared/components/empty-state';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export const meta: MetaFunction = () => {
  return buildMeta({
    description: 'Get the first round of feedback on your resume!',
    title: 'Resume Review',
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const feedback = await getLastResumeFeedback(user(session));

  return json({
    experiences: feedback?.experiences,
    projects: feedback?.projects,
  });
}

const RESUME_MAX_FILE_SIZE = MB_IN_BYTES * 1;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler({ maxPartSize: RESUME_MAX_FILE_SIZE }),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const result = await reviewResume({
    memberId: user(session),
    resume: form.get('resume') as File,
  });

  if (!result.ok) {
    return json(result, { status: result.code });
  }

  return json(result);
}

export default function ReviewResume() {
  return (
    <section className="grid grid-cols-1 gap-16 @5xl:grid-cols-2">
      <UploadSection />
      <FeedbackSection />
    </section>
  );
}

// Upload

function UploadSection() {
  const navigation = useNavigation();

  return (
    <section className="flex flex-col gap-4">
      <Text variant="2xl">Resume Review</Text>

      <Text color="gray-500">
        Currently, the resume review tool will only give feedback on your bullet
        points for experiences and projects. This does not serve as a complete
        resume review, so you should still seek feedback from peers.
        Additionally, this tool relies on AI and may not always provide the best
        feedback, so take it with a grain of salt.
      </Text>

      {navigation.state === 'submitting' && !!navigation.formMethod ? (
        <div className="mt-8">
          <UploadProgress />
        </div>
      ) : (
        <UploadForm />
      )}
    </section>
  );
}

function UploadForm() {
  const actionData = useActionData<typeof action>();

  return (
    <RemixForm
      className="form"
      data-gap="2rem"
      encType="multipart/form-data"
      method="post"
    >
      <Form.Field required>
        <FileUploader
          accept={['application/pdf']}
          id="resume"
          maxFileSize={RESUME_MAX_FILE_SIZE}
          name="resume"
          required
        />
      </Form.Field>

      {actionData && !actionData.ok && (
        <Form.ErrorMessage>{actionData.error}</Form.ErrorMessage>
      )}

      <Button.Group>
        <Button.Submit>Get Feedback</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

function UploadProgress() {
  const progress = useProgress();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4">
      <Text variant="3xl">{Math.floor(progress)}%</Text>

      <Progress value={progress} />

      <Text className="text-center">
        This could take a minute or two -- our reviewer is hard at work! 😜
      </Text>
    </div>
  );
}

// Feedback

function FeedbackSection() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const experiences =
    (!!actionData?.ok && actionData?.data.experiences) ||
    loaderData.experiences ||
    [];

  const projects =
    (!!actionData?.ok && actionData?.data.projects) ||
    loaderData.projects ||
    [];

  return (
    <section className="flex flex-col gap-4 @5xl:max-h-[calc(100vh-4rem)] @5xl:overflow-auto">
      <Text variant="2xl">Feedback</Text>

      {!!experiences.length || !!projects.length ? (
        <>
          <section className="flex flex-col gap-2">
            <Text variant="xl">Experiences ({experiences.length})</Text>

            <ExperienceList>
              {experiences.map((experience) => {
                const title = `${experience.role}, ${experience.company}`;

                return (
                  <Experience
                    bullets={experience.bullets}
                    key={title}
                    title={title}
                  />
                );
              })}
            </ExperienceList>
          </section>

          <section className="flex flex-col gap-2">
            <Text variant="xl">Projects ({projects.length})</Text>

            <ExperienceList>
              {projects.map((project) => {
                return (
                  <Experience
                    bullets={project.bullets}
                    key={project.title}
                    title={project.title}
                  />
                );
              })}
            </ExperienceList>
          </section>
        </>
      ) : (
        <EmptyStateContainer>
          <EmptyState icon={<FileText />} />
          <EmptyStateDescription>
            After you upload your resume, we'll provide feedback on your resume,
            specifically on the bullet points for your experiences and projects.
          </EmptyStateDescription>
        </EmptyStateContainer>
      )}
    </section>
  );
}

function ExperienceList({ children }: PropsWithChildren) {
  return <ul className="flex flex-col gap-12">{children}</ul>;
}

type ExperienceProps = {
  bullets: ResumeFeedback['experiences'][number]['bullets'];
  title: string;
};

function Experience({ bullets, title }: ExperienceProps) {
  return (
    <li>
      <header className="mb-4">
        <Text variant="lg">{title}</Text>
      </header>

      <ul className="flex flex-col gap-8">
        {bullets.map((bullet, i) => {
          return <BulletPoint key={title + i} {...bullet} />;
        })}
      </ul>
    </li>
  );
}

type BulletPointProps =
  ResumeFeedback['experiences'][number]['bullets'][number];

function BulletPoint({ content, feedback, rewrites, score }: BulletPointProps) {
  return (
    <li className="ml-2 flex flex-col gap-4 border-l border-l-gray-200 pl-4">
      <div className="flex items-start justify-between gap-4">
        <Text className="italic" color="gray-500">
          {content}
        </Text>

        <span
          className={cx(
            'rounded px-1.5',

            match(score)
              .with(1, 2, 3, 4, 5, () => 'bg-red-100 text-red-700')
              .with(6, () => 'bg-yellow-100 text-yellow-700')
              .with(7, 8, () => 'bg-cyan-100 text-cyan-700')
              .with(9, 10, () => 'bg-lime-100 text-lime-700')
              .otherwise(() => '')
          )}
        >
          {score}
        </span>
      </div>

      <Text>{feedback}</Text>

      <ul className="flex flex-col gap-2">
        {rewrites.map((rewrite) => {
          return (
            <li
              className="rounded-lg border border-gray-100 bg-gray-50 p-2"
              key={rewrite}
            >
              <Text>Suggestion: {rewrite}</Text>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
