import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  Button,
  Form,
  getActionErrors,
  Select,
  Textarea,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '../shared/components/profile';
import {
  IcebreakersProvider,
  type PromptNumber,
  useIcebreakerContext,
} from '../shared/components/profile.icebreakers';
import {
  db,
  getIcebreakerPrompts,
  upsertIcebreakerResponses,
} from '../shared/core.server';
import { IcebreakerPrompt, IcebreakerResponse } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';

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

  const form = await request.formData();

  const { data, errors } = validateForm(
    UpsertIcebreakerResponsesInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  const memberId = user(session);

  await db.transaction().execute(async (trx) => {
    await upsertIcebreakerResponses(trx, memberId, [
      {
        id: id(),
        promptId: data.icebreakerPrompt1,
        studentId: memberId,
        text: data.icebreakerResponse1,
      },
      {
        id: id(),
        promptId: data.icebreakerPrompt2,
        studentId: memberId,
        text: data.icebreakerResponse2,
      },
      {
        id: id(),
        promptId: data.icebreakerPrompt3,
        studentId: memberId,
        text: data.icebreakerResponse3,
      },
    ]);
  });

  toast(session, {
    message: 'Updated!',
    type: 'success',
  });

  return json(
    {
      error: '',
      errors,
    },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

const {
  icebreakerPrompt1,
  icebreakerPrompt2,
  icebreakerPrompt3,
  icebreakerResponse1,
  icebreakerResponse2,
  icebreakerResponse3,
} = UpsertIcebreakerResponsesInput.keyof().enum;

export default function UpsertIcebreakerResponsesForm() {
  const { icebreakerResponses } = useLoaderData<typeof loader>();

  const submitting = useNavigation().state === 'submitting';

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Icebreakers</ProfileTitle>
      </ProfileHeader>

      <RemixForm className="form" method="post">
        <IcebreakersProvider icebreakerResponses={icebreakerResponses}>
          <IcebreakerGroup number="1" />
          <IcebreakerGroup number="2" />
          <IcebreakerGroup number="3" />
        </IcebreakersProvider>

        <Button.Group>
          <Button loading={submitting} type="submit">
            Save
          </Button>
        </Button.Group>
      </RemixForm>
    </ProfileSection>
  );
}

type IcebreakerGroupProps = {
  number: PromptNumber;
};

function IcebreakerGroup({ number }: IcebreakerGroupProps) {
  const { icebreakerPrompts, icebreakerResponses } =
    useLoaderData<typeof loader>();

  const { errors } = getActionErrors(useActionData<typeof action>());

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
    .with('1', () => icebreakerPrompt1)
    .with('2', () => icebreakerPrompt2)
    .with('3', () => icebreakerPrompt3)
    .exhaustive();

  const responseName = match(number)
    .with('1', () => icebreakerResponse1)
    .with('2', () => icebreakerResponse2)
    .with('3', () => icebreakerResponse3)
    .exhaustive();

  const response = icebreakerResponses[parseInt(number) - 1];

  return (
    <div className="flex flex-col gap-2">
      <Form.Field
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
      </Form.Field>

      <Form.Field error={errors[responseName]} labelFor={responseName} required>
        <Textarea
          defaultValue={response?.text || undefined}
          id={responseName}
          maxLength={280}
          minRows={2}
          name={responseName}
          placeholder="Maximum of 280 characters..."
          required
        />
      </Form.Field>
    </div>
  );
}
