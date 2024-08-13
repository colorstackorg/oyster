import {
  type ActionFunctionArgs,
  unstable_composeUploadHandlers as composeUploadHandlers,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  json,
  type LoaderFunctionArgs,
  unstable_parseMultipartFormData as parseMultipartFormData,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { useEffect, useState } from 'react';
import { FileText } from 'react-feather';
import { match } from 'ts-pattern';

import { cache } from '@oyster/core/member-profile.server';
import { type ResumeFeedback, reviewResume } from '@oyster/core/resumes';
import { Button, cx, FileUploader, Form, MB_IN_BYTES, Text } from '@oyster/ui';
import { Progress } from '@oyster/ui/progress';

import {
  EmptyState,
  EmptyStateContainer,
  EmptyStateDescription,
} from '@/shared/components/empty-state';
import {
  commitSession,
  ensureUserAuthenticated,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const feedback = await cache<ResumeFeedback>(
    `resume_feedback:${memberId}`
  ).get();

  return json({
    experiences: feedback?.experiences,
    projects: feedback?.projects,
  });
}

const RESUME_MAX_FILE_SIZE = MB_IN_BYTES * 1;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler({ maxPartSize: RESUME_MAX_FILE_SIZE }),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const resume = form.get('resume') as unknown as File;

  const feedback = await reviewResume(resume);

  await cache(`resume_feedback:${memberId}`).set(feedback, 60 * 60 * 24 * 7);

  return json(feedback, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function ReviewResume() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const [submitted, setSubmitted] = useState(false);

  const experiences = actionData?.experiences || loaderData.experiences || [];
  const projects = actionData?.projects || loaderData.projects || [];

  const isFeedbackAvailable = !!experiences?.length || !!projects?.length;

  return (
    <section className="grid grid-cols-1 gap-16 @[1000px]:grid-cols-2">
      <section className="flex flex-col gap-4">
        <Text variant="2xl">Resume Review</Text>

        <Text className="italic" color="gray-500">
          Note: Currently, the resume review tool will only give feedback on
          your bullet points for experiences and projects. This does not serve
          as a complete resume review, so you should still seek feedback from
          peers. Additionally, this tool relies on AI and may not always provide
          the best feedback, so take it with a grain of salt.
        </Text>

        <RemixForm
          className="form"
          data-gap="2rem"
          method="post"
          encType="multipart/form-data"
          onSubmit={() => {
            setSubmitted(true);
          }}
        >
          <Form.Field labelFor="resume" required>
            <FileUploader
              accept={['application/pdf']}
              id="resume"
              maxFileSize={RESUME_MAX_FILE_SIZE}
              name="resume"
              onChange={() => {
                setSubmitted(false);
              }}
              required
            />
          </Form.Field>

          <Button.Group>
            <Button.Submit disabled={!!submitted}>Get Feedback</Button.Submit>
          </Button.Group>
        </RemixForm>
      </section>

      <section className="flex max-h-screen flex-col gap-4 overflow-auto">
        <Text variant="2xl">Feedback</Text>

        {navigation.state === 'submitting' ? (
          <ResumeProgress />
        ) : (
          !isFeedbackAvailable && (
            <EmptyStateContainer>
              <EmptyState icon={<FileText />} />
              <EmptyStateDescription>
                After you upload your resume, we'll provide feedback on your
                resume, specifically on the bullet points for your experiences
                and projects.
              </EmptyStateDescription>
            </EmptyStateContainer>
          )
        )}

        {!!experiences.length && (
          <section>
            <Text className="mb-2" variant="xl">
              Experiences ({experiences.length})
            </Text>

            <ul className="flex flex-col gap-12">
              {experiences.map((experience, i) => {
                return (
                  <li key={i}>
                    <header className="mb-4">
                      <Text variant="lg">
                        {experience.role}, {experience.company}
                      </Text>
                      <Text color="gray-500">{experience.date}</Text>
                    </header>

                    <ul className="flex flex-col gap-8">
                      {experience.bullets.map((bullet) => {
                        return (
                          <ResumeBulletPoint
                            key={i + bullet.number}
                            content={bullet.content}
                            feedback={bullet.feedback}
                            rewrites={bullet.rewrites}
                            score={bullet.score}
                            suggestions={bullet.suggestions}
                          />
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!!projects.length && (
          <section>
            <Text className="mb-2" variant="xl">
              Projects ({projects.length})
            </Text>

            <ul className="flex flex-col gap-12">
              {projects.map((project, i) => {
                return (
                  <li key={i}>
                    <header className="mb-4">
                      <Text variant="lg">{project.title}</Text>
                    </header>

                    <ul className="flex flex-col gap-8">
                      {project.bullets.map((bullet) => {
                        return (
                          <ResumeBulletPoint
                            key={i + bullet.number}
                            content={bullet.content}
                            feedback={bullet.feedback}
                            rewrites={bullet.rewrites}
                            score={bullet.score}
                            suggestions={bullet.suggestions}
                          />
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </section>
    </section>
  );
}

function ResumeProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (progress >= 98) {
      return;
    }

    const interval = setInterval(() => {
      setProgress((value) => value + 1.25);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4">
      <Progress value={progress} />

      <div className="flex flex-col items-center gap-2">
        <Text variant="2xl">{Math.round(progress)}%</Text>
        <Text className="text-center">
          Get comfy, this could take a minute or two -- our reviewer is hard at
          work! 😜
        </Text>
      </div>
    </div>
  );
}

type ResumeBulletPointProps = {
  content: string;
  feedback: string;
  rewrites: string[];
  score: number;
  suggestions: string;
};

function ResumeBulletPoint({
  content,
  feedback,
  rewrites,
  score,
  suggestions,
}: ResumeBulletPointProps) {
  return (
    <li className="ml-2 flex flex-col gap-4 border-l border-l-gray-200 pl-4">
      <div className="flex items-start justify-between gap-4">
        <Text className="italic" color="gray-500">
          {content}
        </Text>

        <span
          className={cx(
            'rounded px-1.5',

            match(score as 1 | 2 | 3 | 4 | 5)
              .with(1, () => 'bg-red-100 text-red-700')
              .with(2, () => 'bg-red-100 text-red-700')
              .with(3, () => 'bg-yellow-100 text-yellow-700')
              .with(4, () => 'bg-cyan-100 text-cyan-700')
              .with(5, () => 'bg-lime-100 text-lime-700')
              .run()
          )}
        >
          {score}
        </span>
      </div>

      <Text>
        {feedback} {suggestions}
      </Text>

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
