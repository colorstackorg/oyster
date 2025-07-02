import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  getIcebreakerPrompts,
  upsertIcebreakerResponses,
} from '@oyster/core/member-profile/server';
import {
  IcebreakerPrompt,
  IcebreakerResponse,
} from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import {
  Button,
  Field,
  getErrors,
  Select,
  Textarea,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '@/shared/components/profile';
import {
  IcebreakersProvider,
  type PromptNumber,
  useIcebreakerContext,
} from '@/shared/components/profile.icebreakers';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const [icebreakerPrompts, icebreakerResponses] = await Promise.all([
    getIcebreakerPrompts(['id', 'text']),
    db
      .selectFrom('icebreakerResponses')
      .select(['promptId', 'text'])
      .where('studentId', '=', user(session))
      .orderBy('respondedAt', 'asc')
      .limit(3)
      .execute(),
  ]);

  return json({
    icebreakerPrompts,
    icebreakerResponses,
  });
}

const UpsertIcebreakerResponsesInput = z.object({
  icebreakerPrompt1: IcebreakerPrompt.shape.id,
  icebreakerResponse1: IcebreakerResponse.shape.text,
  icebreakerPrompt2: IcebreakerPrompt.shape.id,
  icebreakerResponse2: IcebreakerResponse.shape.text,
  icebreakerPrompt3: IcebreakerPrompt.shape.id,
  icebreakerResponse3: IcebreakerResponse.shape.text,
});

type UpsertIcebreakerResponsesInput = z.infer<
  typeof UpsertIcebreakerResponsesInput
>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, UpsertIcebreakerResponsesInput);

  if (!result.ok) {
    return json({ errors: result.errors }, { status: 400 });
  }

  const memberId = user(session);

  const {
    icebreakerPrompt1,
    icebreakerPrompt2,
    icebreakerPrompt3,
    icebreakerResponse1,
    icebreakerResponse2,
    icebreakerResponse3,
  } = result.data;

  await db.transaction().execute(async (trx) => {
    await upsertIcebreakerResponses(trx, memberId, [
      {
        id: id(),
        promptId: icebreakerPrompt1,
        studentId: memberId,
        text: icebreakerResponse1,
      },
      {
        id: id(),
        promptId: icebreakerPrompt2,
        studentId: memberId,
        text: icebreakerResponse2,
      },
      {
        id: id(),
        promptId: icebreakerPrompt3,
        studentId: memberId,
        text: icebreakerResponse3,
      },
    ]);
  });

  toast(session, {
    message: 'Updated!',
  });

  return json(
    { error: '' },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

const keys = UpsertIcebreakerResponsesInput.keyof().enum;

export default function UpsertIcebreakerResponsesForm() {
  const { icebreakerResponses } = useLoaderData<typeof loader>();

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Icebreakers</ProfileTitle>
      </ProfileHeader>

      <Form className="form" method="post">
        <IcebreakersProvider icebreakerResponses={icebreakerResponses}>
          <IcebreakerGroup number="1" />
          <IcebreakerGroup number="2" />
          <IcebreakerGroup number="3" />
        </IcebreakersProvider>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </Form>
    </ProfileSection>
  );
}

type IcebreakerGroupProps = {
  number: PromptNumber;
};

function IcebreakerGroup({ number }: IcebreakerGroupProps) {
  const { icebreakerPrompts, icebreakerResponses } =
    useLoaderData<typeof loader>();

  const { errors } = getErrors(useActionData<typeof action>());

  const { promptIds, setPromptId } = useIcebreakerContext();

  const availablePrompts = icebreakerPrompts.filter((prompt) => {
    const { [number]: _, ...otherPromptIds } = promptIds;
    const promptIdsAlreadyUsed = Object.values(otherPromptIds).filter(Boolean);

    return !promptIdsAlreadyUsed.includes(prompt.id);
  });

  const label = match(number)
    .with('1', () => 'Icebreaker #1')
    .with('2', () => 'Icebreaker #2')
    .with('3', () => 'Icebreaker #3')
    .exhaustive();

  const promptName = match(number)
    .with('1', () => keys.icebreakerPrompt1)
    .with('2', () => keys.icebreakerPrompt2)
    .with('3', () => keys.icebreakerPrompt3)
    .exhaustive();

  const responseName = match(number)
    .with('1', () => keys.icebreakerResponse1)
    .with('2', () => keys.icebreakerResponse2)
    .with('3', () => keys.icebreakerResponse3)
    .exhaustive();

  const response = icebreakerResponses[parseInt(number) - 1];

  return (
    <div className="flex flex-col gap-2">
      <Field
        error={errors[promptName]}
        label={label}
        labelFor={promptName}
        required
      >
        <Select
          defaultValue={response?.promptId}
          id={promptName}
          name={promptName}
          onChange={(e) => {
            setPromptId(number, e.currentTarget.value);
          }}
          required
        >
          {availablePrompts.map((prompt) => {
            return (
              <option key={prompt.id} value={prompt.id}>
                {prompt.text}
              </option>
            );
          })}
        </Select>
      </Field>

      <Field error={errors[responseName]} labelFor={responseName} required>
        <Textarea
          defaultValue={response?.text || undefined}
          id={responseName}
          maxLength={280}
          minRows={2}
          name={responseName}
          placeholder="Maximum of 280 characters..."
          required
        />
      </Field>
    </div>
  );
}
