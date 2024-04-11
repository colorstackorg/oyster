import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  Link,
  Form as RemixForm,
  useLoaderData,
  useSubmit,
} from '@remix-run/react';
import React, { type PropsWithChildren, useContext, useState } from 'react';
import { z } from 'zod';

import { db } from '@oyster/db';
import {
  Checkbox,
  Divider,
  type FieldProps,
  Form,
  Input,
  Radio,
  Select,
  Text,
  Textarea,
  useRevalidateOnFocus,
  validateForm,
} from '@oyster/ui';
import { iife } from '@oyster/utils';

import { CityCombobox } from '../shared/components/city-combobox';
import { Route } from '../shared/constants';
import { listEmails } from '../shared/core.server';
import { ensureUserAuthenticated, user } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const [emails] = await Promise.all([listEmails(memberId)]);

  const primaryEmail = emails.find((email) => {
    return !!email.primary;
  })!;

  return json({
    emails,
    primaryEmail: primaryEmail.email,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(z.object({}), Object.fromEntries(form));

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await db.transaction().execute(async (_) => {});

  return json({
    error: '',
    errors,
  });
}

export default function CensusPage() {
  useRevalidateOnFocus();

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8">
      <Text variant="2xl">ColorStack Census '24</Text>
      <Text className="-mt-4" color="gray-500">
        Thank you for taking the time to complete the ColorStack Annual Census!
        This feedback is extremely valuable to us as we continue to grow and
        improve our community.
      </Text>
      <CensusForm />
    </div>
  );
}

type CensusContext = {
  hasGraduated: boolean | null;
  hasInternship: boolean | null;
  setHasGraduated(value: boolean): void;
  setHasInternship(value: boolean): void;
};

const CensusContext = React.createContext<CensusContext>({
  hasGraduated: null,
  hasInternship: null,
  setHasGraduated: (_: boolean) => {},
  setHasInternship: (_: boolean) => {},
});

function CensusForm() {
  const submit = useSubmit();

  const [hasGraduated, setHasGraduated] = useState<boolean | null>(null);
  const [hasInternship, setHasInternship] = useState<boolean>(false);

  return (
    <RemixForm
      className="form gap-[inherit]"
      method="post"
      onBlur={(e) => submit(e.currentTarget)}
    >
      <CensusContext.Provider
        value={{
          hasGraduated,
          hasInternship,
          setHasGraduated,
          setHasInternship,
        }}
      >
        <BasicSection />
        <EducationSection />
        <WorkSection />
        <ColorStackFeedbackSection />
      </CensusContext.Provider>
    </RemixForm>
  );
}

function BasicSection() {
  const { emails, primaryEmail } = useLoaderData<typeof loader>();

  return (
    <CensusSection title="Basic Information">
      <Form.Field
        description={
          <Text>
            If you'd like to change your primary email, please add that email{' '}
            <Link
              className="link"
              target="_blank"
              to={Route['/profile/emails']}
            >
              here
            </Link>{' '}
            first.
          </Text>
        }
        error=""
        label="Email"
        labelFor="email"
        required
      >
        <Select defaultValue={primaryEmail} id="email" name="email" required>
          {emails.map(({ email }) => {
            return (
              <option key={email} value={email}>
                {email}
              </option>
            );
          })}
        </Select>
      </Form.Field>

      <Form.Field
        description="This will help us plan for our in-person events this summer."
        error=""
        label="What city will you be in this summer?"
        labelFor="location"
        required
      >
        <CityCombobox
          defaultLatitude={undefined}
          defaultLongitude={undefined}
          defaultValue={undefined}
          name="location"
          latitudeName="locationLatitude"
          longitudeName="locationLongitude"
          required
        />
      </Form.Field>
    </CensusSection>
  );
}

function EducationSection() {
  const { hasGraduated, setHasGraduated } = useContext(CensusContext);

  return (
    <CensusSection title="Education">
      <Form.Field
        description="If you've received your Bachelor's degree, you are officially ColorStack Alumni!"
        error=""
        label="Have you already graduated?"
        required
      >
        <Radio.Group>
          <Radio
            color="lime-100"
            id={'hasGraduated' + '1'}
            label="Yes"
            name="hasGraduated"
            onChange={(e) => setHasGraduated(e.currentTarget.value === '1')}
            required
            value="1"
          />
          <Radio
            color="pink-100"
            id={'hasGraduated' + '0'}
            label="No"
            name="hasGraduated"
            onChange={(e) => setHasGraduated(e.currentTarget.value === '1')}
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      {hasGraduated === true && (
        <Form.Field
          error=""
          label="Did you graduate with a Computer Science (or related) degree?"
          required
        >
          <Radio.Group>
            <Radio
              color="lime-100"
              id={'hasTechnicalDegree' + '1'}
              label="Yes"
              name="hasTechnicalDegree"
              required
              value="1"
            />
            <Radio
              color="pink-100"
              id={'hasTechnicalDegree' + '0'}
              label="No"
              name="hasTechnicalDegree"
              required
              value="0"
            />
          </Radio.Group>
        </Form.Field>
      )}

      {hasGraduated === false && (
        <>
          <Form.Field
            description="What school do you currently attend?"
            error=""
            label="School"
            labelFor="school"
            required
          >
            <Input name="school" required />
          </Form.Field>

          <Form.Field
            error=""
            label="Are you an international student?"
            required
          >
            <Radio.Group>
              <Radio
                color="lime-100"
                id={'isInternationalStudent' + '1'}
                label="Yes"
                name="isInternationalStudent"
                required
                value="1"
              />
              <Radio
                color="pink-100"
                id={'isInternationalStudent' + '0'}
                label="No"
                name="isInternationalStudent"
                required
                value="0"
              />
            </Radio.Group>
          </Form.Field>

          <Form.Field
            error=""
            label="My confidence in Computer Science related school work has increased since joining ColorStack."
            required
          >
            <AgreeRating name="confidenceRatingSchool" />
          </Form.Field>

          <Form.Field
            error=""
            label="I am confident that I will graduate with my tech related degree."
            required
          >
            <AgreeRating name="confidenceRatingGraduating" />
          </Form.Field>

          <Form.Field
            error=""
            label="I am confident that I will graduate with a full time offer in tech."
            required
          >
            <AgreeRating name="confidenceRatingFullTimeJob" />
          </Form.Field>
        </>
      )}
    </CensusSection>
  );
}

function WorkSection() {
  const { hasGraduated, hasInternship, setHasInternship } =
    useContext(CensusContext);

  if (hasGraduated === null) {
    return null;
  }

  return hasGraduated ? (
    <CensusSection title="Work Plans">
      <Form.Field
        error=""
        label="Have you accepted a full-time offer in a technical role?"
        required
      >
        <Radio.Group>
          <Radio
            color="lime-100"
            id={'hasTechnicalRole' + '1'}
            label="Yes"
            name="hasTechnicalRole"
            required
            value="1"
          />
          <Radio
            color="pink-100"
            id={'hasTechnicalRole' + '0'}
            label="No"
            name="hasTechnicalRole"
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      <Form.Field
        error=""
        label="Do you work for (or will you be joining) a ColorStack partner?"
        required
      >
        <Radio.Group>
          <Radio
            color="lime-100"
            id={'hasRoleWithPartner' + '1'}
            label="Yes"
            name="hasRoleWithPartner"
            required
            value="1"
          />
          <Radio
            color="pink-100"
            id={'hasRoleWithPartner' + '0'}
            label="No"
            name="hasRoleWithPartner"
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      <Form.Field
        error=""
        label="I feel more prepared for a full-time job because of ColorStack."
        required
      >
        <AgreeRating name="confidenceRatingGraduating" />
      </Form.Field>
    </CensusSection>
  ) : (
    <CensusSection title="Work Plans">
      <Form.Field
        error=""
        label="Do you have an internship this summer?"
        required
      >
        <Radio.Group>
          <Radio
            color="lime-100"
            id={'hasInternship' + '1'}
            label="Yes"
            name="hasInternship"
            onChange={(e) => setHasInternship(e.currentTarget.value === '1')}
            required
            value="1"
          />
          <Radio
            color="pink-100"
            id={'hasInternship' + '0'}
            label="No"
            name="hasInternship"
            onChange={(e) => setHasInternship(e.currentTarget.value === '1')}
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      {hasInternship && (
        <Form.Field
          error=""
          label="What company will you be working with?"
          labelFor="company"
          required
        >
          <Input name="company" required />
        </Form.Field>
      )}

      {hasInternship && (
        <Form.Field
          error=""
          label="If you received multiple offers, list out the additional companies."
          labelFor="additionalCompanies"
        >
          <Input name="additionalCompanies" />
        </Form.Field>
      )}

      <Form.Field
        error=""
        label="My confidence in technical interviewing has increased since joining ColorStack."
        required
      >
        <AgreeRating name="confidenceRatingInterviewing" />
      </Form.Field>
    </CensusSection>
  );
}

function ColorStackFeedbackSection() {
  const { hasGraduated } = useContext(CensusContext);

  return (
    <CensusSection last title="ColorStack Feedback">
      {hasGraduated ? (
        <>
          <Form.Field
            error=""
            label="Would you join and be active in a postgrad/alumni ColorStack community?"
            required
          >
            <Radio.Group>
              <Radio
                color="lime-100"
                id={'joinAlumni' + '1'}
                label="Yes"
                name="joinAlumni"
                required
                value="1"
              />
              <Radio
                color="pink-100"
                id={'joinAlumni' + '0'}
                label="No"
                name="joinAlumni"
                required
                value="0"
              />
            </Radio.Group>
          </Form.Field>

          <Form.Field
            error=""
            label="What type of programming would you like to see in a ColorStack alumni community?"
            required
          >
            <Textarea
              defaultValue={undefined}
              id="alumniProgramming"
              name="alumniProgramming"
              minRows={2}
              required
            />
          </Form.Field>
        </>
      ) : (
        <>
          <Form.Field
            error=""
            label="Which resources have been the most beneficial to you?"
            required
          >
            <Checkbox.Group>
              {[
                'AlgoExpert',
                'CompSciLib',
                'Fam Fridays',
                'InterviewPen',
                'Newsletter',
                'Slack',
                'Wiki',
              ].map((resource) => {
                return (
                  <Checkbox
                    key={resource}
                    defaultChecked={undefined}
                    id={'currentResources' + resource}
                    label={resource}
                    name="currentResources"
                    value={resource}
                  />
                );
              })}
            </Checkbox.Group>
          </Form.Field>

          <Form.Field
            error=""
            label="Which resources would you like to see added?"
            labelFor="futureResources"
            required
          >
            <Textarea
              defaultValue={undefined}
              id="futureResources"
              name="futureResources"
              minRows={2}
              required
            />
          </Form.Field>

          <Form.Field
            error=""
            label="As a ColorStack member, what are you looking for most in the ColorStack community?"
            required
          >
            {iife(() => {
              return (
                <Radio.Group>
                  {[
                    'Career development (interview prep, resume review, etc.)',
                    'Access to opportunities',
                    'Academic help',
                    'Fellowship + networking',
                  ].map((category) => {
                    return (
                      <Radio
                        key={category}
                        defaultChecked={undefined}
                        id={'wants' + category}
                        label={category}
                        name="wants"
                        required
                        value={category}
                      />
                    );
                  })}
                </Radio.Group>
              );
            })}
          </Form.Field>
        </>
      )}
    </CensusSection>
  );
}

type CensusSectionProps = PropsWithChildren<{
  last?: boolean;
  title: string;
}>;

function CensusSection({ children, last = false, title }: CensusSectionProps) {
  return (
    <section className="flex flex-col gap-[inherit]">
      <Text className="-mb-4" color="gray-500" variant="xl">
        {title}
      </Text>

      {children}

      {!last && <Divider />}
    </section>
  );
}

function AgreeRating({ name }: Pick<FieldProps<string>, 'name'>) {
  const ratings = [
    'Strongly agree',
    'Somewhat agree',
    'Neither agree nor disagree',
    'Somewhat disagree',
    'Strongly disagree',
  ];

  return (
    <Checkbox.Group>
      {ratings.map((rating) => {
        return (
          <Radio
            key={rating}
            defaultChecked={undefined}
            id={name + rating}
            label={rating}
            name={name}
            required
            value={rating}
          />
        );
      })}
    </Checkbox.Group>
  );
}
