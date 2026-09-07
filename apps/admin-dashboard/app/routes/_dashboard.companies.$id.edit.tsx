import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';

import {
  getCompany,
  isApifyConfigured,
  updateCompany,
} from '@oyster/core/employment/server';
import { AdminUpdateCompanyInput } from '@oyster/core/employment/types';
import {
  CompanyDomainField,
  CompanyImageUrlField,
  CompanyLinkedInSlugField,
  CompanyLogoPreview,
  CompanyNameField,
  CompanyResumeBooksField,
} from '@oyster/core/employment/ui';
import {
  listResumeBooks,
  updateCompanyResumeBookSponsorships,
} from '@oyster/core/resume-books';
import { db } from '@oyster/db';
import {
  Button,
  ErrorMessage,
  getErrors,
  Modal,
  Text,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const companyId = params.id as string;

  const [company, resumeBooks, sponsorships] = await Promise.all([
    getCompany({
      select: ['domain', 'id', 'imageUrl', 'linkedinSlug', 'name'],
      where: { id: companyId },
    }),

    listResumeBooks({
      select: ['id', 'name'],
    }),

    db
      .selectFrom('resumeBookSponsors')
      .select(['resumeBookId'])
      .where('companyId', '=', companyId)
      .execute(),
  ]);

  if (!company) {
    throw new Response(null, { status: 404 });
  }

  return {
    apifyConfigured: isApifyConfigured(),
    company,
    resumeBookIds: sponsorships.map((sponsorship) => sponsorship.resumeBookId),
    resumeBooks,
  };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const companyId = params.id as string;

  const result = await validateForm(request, AdminUpdateCompanyInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const { resumeBookIds, ...companyInput } = result.data;

  const updateResult = await updateCompany({
    ...companyInput,
    id: companyId,
  });

  if (!updateResult.ok) {
    return data({ error: updateResult.error }, { status: updateResult.code });
  }

  const sponsorshipResult = await updateCompanyResumeBookSponsorships({
    companyId,
    resumeBookIds,
  });

  if (!sponsorshipResult.ok) {
    return data(
      { error: sponsorshipResult.error },
      { status: sponsorshipResult.code }
    );
  }

  toast(session, {
    message: 'Updated company.',
    type: 'success',
  });

  const url = new URL(request.url);

  url.pathname = Route['/companies'];

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function EditCompanyPage() {
  const { apifyConfigured, company, resumeBookIds, resumeBooks } =
    useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/companies']}>
      <Modal.Header>
        <Modal.Title>Edit Company: {company.name}</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <CompanyLogoPreview imageUrl={company.imageUrl} />
        <CompanyNameField defaultValue={company.name} error={errors.name} />
        <CompanyDomainField
          defaultValue={company.domain || ''}
          error={errors.domain}
        />
        <CompanyImageUrlField
          defaultValue={company.imageUrl || ''}
          error={errors.imageUrl}
        />
        <CompanyLinkedInSlugField
          defaultValue={company.linkedinSlug || ''}
          error={errors.linkedinSlug}
        />
        {!apifyConfigured && (
          <Text color="gray-500" variant="sm">
            Apify is not configured. Use Logo URL to set the logo manually.
          </Text>
        )}
        <CompanyResumeBooksField
          defaultValue={resumeBookIds}
          error={errors.resumeBookIds}
          resumeBooks={resumeBooks}
        />

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Save Changes</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
