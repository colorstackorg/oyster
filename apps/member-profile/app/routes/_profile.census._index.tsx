import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { createCookie } from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from '@remix-run/react';
import React, { type PropsWithChildren, useContext, useState } from 'react';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { BooleanInput } from '@oyster/types';
import {
  Button,
  Checkbox,
  Divider,
  type FieldProps,
  Form,
  getActionErrors,
  Input,
  Radio,
  Select,
  Text,
  Textarea,
  useRevalidateOnFocus,
  validateForm,
} from '@oyster/ui';

import { CityCombobox } from '../shared/components/city-combobox';
import { Route } from '../shared/constants';
import { ENV } from '../shared/constants.server';
import { getCensusResponse, submitCensusResponse } from '../shared/core.server';
import {
  BaseCensusResponse,
  CompanyCombobox,
  CompanyFieldProvider,
  FreeTextCompanyInput,
  SubmitCensusResponseData,
} from '../shared/core.ui';
import { ensureUserAuthenticated, user } from '../shared/session.server';

const censusCookie = createCookie('census', {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  secure: ENV.ENVIRONMENT === 'production',
});

const CensusCookieObject = z
  .object({})
  .merge(SubmitCensusResponseData.options[0])
  .merge(SubmitCensusResponseData.options[1])
  .extend({ hasGraduated: BooleanInput })
  .partial();

const SubmitCensusResponseData_ = z
  .object({})
  .merge(SubmitCensusResponseData.options[0].partial())
  .merge(SubmitCensusResponseData.options[1].partial())
  .merge(BaseCensusResponse)
  .extend({ hasGraduated: BooleanInput });

async function getCensusCookie(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  const parsedCookie = await censusCookie.parse(cookieHeader);
  const cookie = CensusCookieObject.parse(parsedCookie);

  return cookie;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const response = await getCensusResponse({
    select: [],
    where: {
      studentId: user(session),
      year: new Date().getFullYear(),
    },
  });

  if (response) {
    return redirect(Route['/census/confirmation']);
  }

  let cookie: z.infer<typeof CensusCookieObject>;

  try {
    cookie = await getCensusCookie(request);
  } catch (e) {
    cookie = {};
  }

  return json(
    { progress: cookie },
    {
      headers: {
        'Set-Cookie': await censusCookie.serialize(cookie),
      },
    }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const values = {
    ...Object.fromEntries(form),
    ...(!!form.get('currentResources') && {
      currentResources: form.getAll('currentResources'),
    }),
  };

  const isSubmit = form.get('intent') === 'submit';

  const { data, errors } = !isSubmit
    ? validateForm(CensusCookieObject, values)
    : validateForm(SubmitCensusResponseData_, values);

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  if (!isSubmit) {
    const existingCookie = await getCensusCookie(request);

    const cookie = {
      ...existingCookie,
      ...data,
    };

    return json(
      {
        error: '',
        errors,
      },
      {
        headers: {
          'Set-Cookie': await censusCookie.serialize(cookie),
        },
      }
    );
  }

  try {
    await submitCensusResponse(user(session), data as SubmitCensusResponseData);

    return redirect(Route['/census/confirmation'], {
      headers: {
        'Set-Cookie': await censusCookie.serialize('', { maxAge: 1 }),
      },
    });
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
    });
  }
}

type CensusContext = {
  hasGraduated: boolean | null;
  hasInternship: boolean | null;
  hasTechnicalRole: boolean | null;
  isInternational: boolean | null;
  setHasGraduated(value: boolean): void;
  setHasInternship(value: boolean): void;
  setHasTechnicalRole(value: boolean): void;
  setIsInternational(value: boolean): void;
};

const CensusContext = React.createContext<CensusContext>({
  hasGraduated: null,
  hasInternship: null,
  hasTechnicalRole: null,
  isInternational: null,
  setHasGraduated: (_: boolean) => {},
  setHasInternship: (_: boolean) => {},
  setHasTechnicalRole: (_: boolean) => {},
  setIsInternational: (_: boolean) => {},
});

const keys = SubmitCensusResponseData_.keyof().enum;

export default function CensusForm() {
  useRevalidateOnFocus();

  const { progress } = useLoaderData<typeof loader>();
  const { error } = getActionErrors(useActionData<typeof action>());
  const submit = useSubmit();
  const { state, formData } = useNavigation();

  const submitting =
    state === 'submitting' && formData?.get('intent') === 'submit';

  const [hasGraduated, setHasGraduated] = useState<boolean | null>(
    progress.hasGraduated ?? null
  );

  const [hasTechnicalRole, setHasTechnicalRole] = useState<boolean>(
    progress.hasTechnicalRole ?? false
  );

  const [hasInternship, setHasInternship] = useState<boolean>(
    progress.hasInternship ?? false
  );

  const [isInternational, setIsInternational] = useState<boolean | null>(
    progress.isInternational ?? null
  );

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
          hasTechnicalRole,
          isInternational,
          setHasGraduated,
          setHasInternship,
          setHasTechnicalRole,
          setIsInternational,
        }}
      >
        <BasicSection />
        <EducationSection />
        <WorkSection />
        <ColorStackFeedbackSection />

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button
          fill
          loading={submitting}
          name="intent"
          type="submit"
          value="submit"
        >
          Submit
        </Button>
      </CensusContext.Provider>
    </RemixForm>
  );
}

function BasicSection() {
  const { progress } = useLoaderData<typeof loader>();
  const { errors } = getActionErrors(useActionData<typeof action>());

  return (
    <CensusSection title="Basic Information">
      <Form.Field
        description="This will help us plan for our in-person events this summer."
        error={errors.summerLocation}
        label="What city will you be in this summer?"
        labelFor={keys.summerLocation}
        required
      >
        <CityCombobox
          defaultLatitude={progress.summerLocationLatitude}
          defaultLongitude={progress.summerLocationLongitude}
          defaultValue={progress.summerLocation}
          name={keys.summerLocation}
          latitudeName={keys.summerLocationLatitude}
          longitudeName={keys.summerLocationLongitude}
          required
        />
      </Form.Field>
    </CensusSection>
  );
}

function EducationSection() {
  const { progress } = useLoaderData<typeof loader>();
  const { errors } = getActionErrors(useActionData<typeof action>());

  const { hasGraduated, isInternational, setHasGraduated, setIsInternational } =
    useContext(CensusContext);

  return (
    <CensusSection title="Education">
      <Form.Field
        description="If you've received your Bachelor's degree, you are officially ColorStack Alumni!"
        error={errors.hasGraduated}
        label="Have you already graduated?"
        required
      >
        <Radio.Group>
          <Radio
            color="lime-100"
            defaultChecked={progress.hasGraduated === true}
            id={keys.hasGraduated + '1'}
            label="Yes"
            name={keys.hasGraduated}
            onChange={(e) => setHasGraduated(e.currentTarget.value === '1')}
            required
            value="1"
          />
          <Radio
            color="pink-100"
            defaultChecked={progress.hasGraduated === false}
            id={keys.hasGraduated + '0'}
            label="No"
            name={keys.hasGraduated}
            onChange={(e) => setHasGraduated(e.currentTarget.value === '1')}
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      {hasGraduated === true && (
        <Form.Field
          error={errors.hasTechnicalDegree}
          label="Did you graduate with a Computer Science (or related) degree?"
          required
        >
          <Radio.Group>
            <Radio
              color="lime-100"
              defaultChecked={progress.hasTechnicalDegree === true}
              id={keys.hasTechnicalDegree + '1'}
              label="Yes"
              name={keys.hasTechnicalDegree}
              required
              value="1"
            />
            <Radio
              color="pink-100"
              defaultChecked={progress.hasTechnicalDegree === false}
              id={keys.hasTechnicalDegree + '0'}
              label="No"
              name={keys.hasTechnicalDegree}
              required
              value="0"
            />
          </Radio.Group>
        </Form.Field>
      )}

      {hasGraduated === false && (
        <>
          <Form.Field
            error={errors.isInternational}
            label="Are you an international student?"
            required
          >
            <Radio.Group>
              <Radio
                color="lime-100"
                defaultChecked={progress.isInternational === true}
                id={keys.isInternational + '1'}
                label="Yes"
                name={keys.isInternational}
                onChange={(e) => {
                  setIsInternational(e.currentTarget.value === '1');
                }}
                required
                value="1"
              />
              <Radio
                color="pink-100"
                defaultChecked={progress.isInternational === false}
                id={keys.isInternational + '0'}
                label="No"
                name={keys.isInternational}
                onChange={(e) => {
                  setIsInternational(e.currentTarget.value === '1');
                }}
                required
                value="0"
              />
            </Radio.Group>
          </Form.Field>

          {isInternational && (
            <Form.Field
              error={errors.internationalSupport}
              label="Is there anything ColorStack can do to support you as an international student?"
              labelFor={keys.internationalSupport}
              required
            >
              <Textarea
                defaultValue={progress.internationalSupport}
                id={keys.internationalSupport}
                name={keys.internationalSupport}
                minRows={2}
                required
              />
            </Form.Field>
          )}

          <Form.Field
            error={errors.isOnTrackToGraduate}
            label="Are you on track to graduate in 4 years?"
            required
          >
            <Radio.Group>
              <Radio
                color="lime-100"
                defaultChecked={progress.isOnTrackToGraduate === true}
                id={keys.isOnTrackToGraduate + '1'}
                label="Yes"
                name={keys.isOnTrackToGraduate}
                required
                value="1"
              />
              <Radio
                color="pink-100"
                defaultChecked={progress.isOnTrackToGraduate === false}
                id={keys.isOnTrackToGraduate + '0'}
                label="No"
                name={keys.isOnTrackToGraduate}
                required
                value="0"
              />
            </Radio.Group>
          </Form.Field>

          <Form.Field
            error={errors.confidenceRatingSchool}
            label="My confidence in Computer Science related school work has increased since joining ColorStack."
            required
          >
            <AgreeRating
              defaultValue={progress.confidenceRatingSchool}
              name={keys.confidenceRatingSchool}
            />
          </Form.Field>

          <Form.Field
            error={errors.confidenceRatingGraduating}
            label="I am confident that I will graduate with my tech-related degree."
            required
          >
            <AgreeRating
              defaultValue={progress.confidenceRatingGraduating}
              name={keys.confidenceRatingGraduating}
            />
          </Form.Field>

          <Form.Field
            error={errors.confidenceRatingFullTimeJob}
            label="I am confident that I will graduate with a full-time offer in tech."
            required
          >
            <AgreeRating
              defaultValue={progress.confidenceRatingFullTimeJob}
              name={keys.confidenceRatingFullTimeJob}
            />
          </Form.Field>
        </>
      )}
    </CensusSection>
  );
}

function WorkSection() {
  const { progress } = useLoaderData<typeof loader>();
  const { errors } = getActionErrors(useActionData<typeof action>());

  const {
    hasGraduated,
    hasInternship,
    hasTechnicalRole,
    setHasInternship,
    setHasTechnicalRole,
  } = useContext(CensusContext);

  if (hasGraduated === null) {
    return null;
  }

  return hasGraduated ? (
    <CensusSection title="Work Plans">
      <Form.Field
        error={errors.hasTechnicalRole}
        label="Have you accepted a full-time offer in a technical role?"
        required
      >
        <Radio.Group>
          <Radio
            color="lime-100"
            defaultChecked={progress.hasTechnicalRole === true}
            id={keys.hasTechnicalRole + '1'}
            label="Yes"
            name={keys.hasTechnicalRole}
            onChange={(e) => setHasTechnicalRole(e.currentTarget.value === '1')}
            required
            value="1"
          />
          <Radio
            color="pink-100"
            defaultChecked={progress.hasTechnicalRole === false}
            id={keys.hasTechnicalRole + '0'}
            label="No"
            name={keys.hasTechnicalRole}
            onChange={(e) => setHasTechnicalRole(e.currentTarget.value === '1')}
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      {hasTechnicalRole && (
        <>
          <CompanyFieldProvider>
            <Form.Field
              error={errors.companyId}
              label="What company did you accept a full-time offer for?"
              labelFor={keys.companyId}
              required
            >
              <div className="flex flex-col gap-2">
                <CompanyCombobox
                  defaultCompanyName={progress.companyName}
                  defaultCrunchbaseId=""
                  name={keys.companyId}
                />
                <FreeTextCompanyInput
                  defaultValue={progress.companyName}
                  name={keys.companyName}
                />
              </div>
            </Form.Field>
          </CompanyFieldProvider>

          <Form.Field
            error={errors.hasRoleThroughColorStack}
            label="Did you learn about this role via ColorStack?"
            required
          >
            <Radio.Group>
              <Radio
                color="lime-100"
                defaultChecked={progress.hasRoleThroughColorStack === true}
                id={keys.hasRoleThroughColorStack + '1'}
                label="Yes"
                name={keys.hasRoleThroughColorStack}
                required
                value="1"
              />
              <Radio
                color="pink-100"
                defaultChecked={progress.hasRoleThroughColorStack === false}
                id={keys.hasRoleThroughColorStack + '0'}
                label="No"
                name={keys.hasRoleThroughColorStack}
                required
                value="0"
              />
            </Radio.Group>
          </Form.Field>

          <Form.Field
            description="Please separate multiple companies with a comma."
            error={errors.additionalOffers}
            label="If you received multiple offers, list out the additional companies."
            labelFor={keys.additionalOffers}
          >
            <Input
              defaultValue={progress.additionalOffers}
              id={keys.additionalOffers}
              name={keys.additionalOffers}
            />
          </Form.Field>
        </>
      )}

      <Form.Field
        error={errors.confidenceRatingFullTimePreparedness}
        label="I feel more prepared for a full-time job because of ColorStack."
        required
      >
        <AgreeRating
          defaultValue={progress.confidenceRatingFullTimePreparedness}
          name={keys.confidenceRatingFullTimePreparedness}
        />
      </Form.Field>
    </CensusSection>
  ) : (
    <CensusSection title="Work Plans">
      <Form.Field
        error={errors.hasInternship}
        label="Do you have an internship this summer?"
        required
      >
        <Radio.Group>
          <Radio
            color="lime-100"
            defaultChecked={progress.hasInternship === true}
            id={keys.hasInternship + '1'}
            label="Yes"
            name={keys.hasInternship}
            onChange={(e) => setHasInternship(e.currentTarget.value === '1')}
            required
            value="1"
          />
          <Radio
            color="pink-100"
            defaultChecked={progress.hasInternship === false}
            id={keys.hasInternship + '0'}
            label="No"
            name={keys.hasInternship}
            onChange={(e) => setHasInternship(e.currentTarget.value === '1')}
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      {hasInternship && (
        <>
          <CompanyFieldProvider>
            <Form.Field
              error={errors.companyId}
              label="What company will you be working with?"
              labelFor={keys.companyId}
              required
            >
              <div className="flex flex-col gap-2">
                <CompanyCombobox
                  defaultCompanyName={progress.companyName}
                  defaultCrunchbaseId=""
                  name={keys.companyId}
                />
                <FreeTextCompanyInput
                  defaultValue={progress.companyName}
                  name={keys.companyName}
                />
              </div>
            </Form.Field>
          </CompanyFieldProvider>

          <Form.Field
            description="Please separate multiple companies with a comma."
            error={errors.additionalOffers}
            label="If you received multiple offers, list out the additional companies."
            labelFor={keys.additionalOffers}
          >
            <Input
              defaultValue={progress.additionalOffers}
              id={keys.additionalOffers}
              name={keys.additionalOffers}
            />
          </Form.Field>

          <Form.Field
            error={errors.hasRoleThroughColorStack}
            label="Did you learn about your internship(s) via ColorStack?"
            required
          >
            <Radio.Group>
              <Radio
                color="lime-100"
                defaultChecked={progress.hasRoleThroughColorStack === true}
                id={keys.hasRoleThroughColorStack + '1'}
                label="Yes"
                name={keys.hasRoleThroughColorStack}
                required
                value="1"
              />
              <Radio
                color="pink-100"
                defaultChecked={progress.hasRoleThroughColorStack === false}
                id={keys.hasRoleThroughColorStack + '0'}
                label="No"
                name={keys.hasRoleThroughColorStack}
                required
                value="0"
              />
            </Radio.Group>
          </Form.Field>
        </>
      )}

      <Form.Field
        error={errors.confidenceRatingInterviewing}
        label="My confidence in technical interviewing has increased since joining ColorStack."
        required
      >
        <AgreeRating
          defaultValue={progress.confidenceRatingInterviewing}
          name={keys.confidenceRatingInterviewing}
        />
      </Form.Field>
    </CensusSection>
  );
}

function ColorStackFeedbackSection() {
  const { progress } = useLoaderData<typeof loader>();
  const { errors } = getActionErrors(useActionData<typeof action>());

  const { hasGraduated } = useContext(CensusContext);

  return (
    <CensusSection last title="ColorStack Feedback">
      <Form.Field
        error={errors.currentResources}
        label="Which resources have been the most beneficial to you?"
        required
      >
        <Checkbox.Group>
          {[
            'AlgoExpert',
            'Career Coaching',
            'CompSciLib',
            'Fam Fridays',
            'interviewing.io',
            'InterviewPen',
            'Newsletter',
            'Resume Book',
            'Scholarships (Family Fund, Travel)',
            'Slack',
            'StackedUp Summit',
            'Wiki',
          ].map((resource) => {
            return (
              <Checkbox
                defaultChecked={progress.currentResources?.includes(resource)}
                id={keys.currentResources + resource}
                key={resource}
                label={resource}
                name={keys.currentResources}
                value={resource}
              />
            );
          })}
        </Checkbox.Group>
      </Form.Field>

      {hasGraduated && (
        <>
          <Form.Field
            error={errors.joinAlumni}
            label="Would you join and be active in a postgrad/alumni ColorStack community?"
            required
          >
            <Radio.Group>
              <Radio
                color="lime-100"
                defaultChecked={progress.joinAlumni === true}
                id={keys.joinAlumni + '1'}
                label="Yes"
                name={keys.joinAlumni}
                required
                value="1"
              />
              <Radio
                color="pink-100"
                defaultChecked={progress.joinAlumni === false}
                id={keys.joinAlumni + '0'}
                label="No"
                name={keys.joinAlumni}
                required
                value="0"
              />
            </Radio.Group>
          </Form.Field>

          <Form.Field
            error={errors.alumniProgramming}
            label="What type of programming would you like to see in a ColorStack alumni community?"
            labelFor={keys.alumniProgramming}
            required
          >
            <Textarea
              defaultValue={progress.alumniProgramming}
              id={keys.alumniProgramming}
              name={keys.alumniProgramming}
              minRows={2}
              required
            />
          </Form.Field>
        </>
      )}

      {hasGraduated === false && (
        <>
          <Form.Field
            error={errors.futureResources}
            label="Which resources would you like to see added?"
            labelFor={keys.futureResources}
            required
          >
            <Textarea
              defaultValue={progress.futureResources}
              id={keys.futureResources}
              name={keys.futureResources}
              minRows={2}
              required
            />
          </Form.Field>

          <Form.Field
            error={errors.communityNeeds}
            label="As a ColorStack member, what are you looking for most in the ColorStack community?"
            required
          >
            <Radio.Group>
              {[
                'Career development (interview prep, resume review, etc.)',
                'Access to opportunities',
                'Academic help',
                'Fellowship + networking',
              ].map((category) => {
                return (
                  <Radio
                    defaultChecked={progress.communityNeeds?.includes(category)}
                    id={keys.communityNeeds + category}
                    key={category}
                    label={category}
                    name={keys.communityNeeds}
                    required
                    value={category}
                  />
                );
              })}
            </Radio.Group>
          </Form.Field>
        </>
      )}

      <Form.Field
        error={errors.hasMadeFriend}
        label="Have you made a friend through ColorStack?"
        required
      >
        <Radio.Group>
          <Radio
            color="lime-100"
            defaultChecked={progress.hasMadeFriend === true}
            id={keys.hasMadeFriend + '1'}
            label="Yes"
            name={keys.hasMadeFriend}
            required
            value="1"
          />
          <Radio
            color="pink-100"
            defaultChecked={progress.hasMadeFriend === false}
            id={keys.hasMadeFriend + '0'}
            label="No"
            name={keys.hasMadeFriend}
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      <Form.Field
        description="Please answer on a scale of 1 to 10, 10 being strongly recommend."
        error={errors.nps}
        label="How likely are you to recommend ColorStack to a friend?"
        labelFor={keys.nps}
        required
      >
        <Select
          defaultValue={progress.nps}
          id={keys.nps}
          name={keys.nps}
          required
        >
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
            return (
              <option key={score} value={score}>
                {score}
              </option>
            );
          })}
        </Select>
      </Form.Field>
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

function AgreeRating({
  defaultValue,
  name,
}: Pick<FieldProps<number>, 'defaultValue' | 'name'>) {
  return (
    <Radio.Group>
      {[
        'Strongly agree',
        'Somewhat agree',
        'Neither agree nor disagree',
        'Somewhat disagree',
        'Strongly disagree',
      ].map((label, i) => {
        const value = (5 - i) as 1 | 2 | 3 | 4 | 5;

        return (
          <Radio
            color={match(value)
              .with(5, () => 'lime-100' as const)
              .with(4, () => 'cyan-100' as const)
              .with(3, () => 'blue-100' as const)
              .with(2, () => 'orange-100' as const)
              .with(1, () => 'red-100' as const)
              .exhaustive()}
            defaultChecked={defaultValue === value}
            id={name + value}
            key={value}
            label={label}
            name={name}
            required
            value={value}
          />
        );
      })}
    </Radio.Group>
  );
}
