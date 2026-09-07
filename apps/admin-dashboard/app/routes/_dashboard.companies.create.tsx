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
  createCompany,
  isApifyConfigured,
} from '@oyster/core/employment/server';
import { AdminCreateCompanyInput } from '@oyster/core/employment/types';
import {
  CompanyDomainField,
  CompanyImageUrlField,
  CompanyLinkedInSlugField,
  CompanyNameField,
  CompanyResumeBooksField,
} from '@oyster/core/employment/ui';
import {
  listResumeBooks,
  updateCompanyResumeBookSponsorships,
} from '@oyster/core/resume-books';
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

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const resumeBooks = await listResumeBooks({
    select: ['id', 'name'],
  });

  return {
    apifyConfigured: isApifyConfigured(),
    resumeBooks,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, AdminCreateCompanyInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const { resumeBookIds, ...companyInput } = result.data;

  if (
    !companyInput.linkedinSlug &&
    (!companyInput.name || !companyInput.domain)
  ) {
    return data(
      {
        errors: {
          linkedinSlug:
            'Provide a LinkedIn company slug or enter a name and domain manually.',
        },
      },
      { status: 400 }
    );
  }

  const createResult = await createCompany(companyInput);

  if (!createResult.ok) {
    return data({ error: createResult.error }, { status: createResult.code });
  }

  if (resumeBookIds.length) {
    const sponsorshipResult = await updateCompanyResumeBookSponsorships({
      companyId: createResult.data.id,
      resumeBookIds,
    });

    if (!sponsorshipResult.ok) {
      return data(
        { error: sponsorshipResult.error },
        { status: sponsorshipResult.code }
      );
    }
  }

  toast(session, {
    message: 'Created company.',
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

export default function CreateCompanyPage() {
  const { apifyConfigured, resumeBooks } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/companies']}>
      <Modal.Header>
        <Modal.Title>Create Company</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        {!apifyConfigured && (
          <Text color="gray-500" variant="sm">
            Apify is not configured, so LinkedIn sync is unavailable. Enter the
            company details manually below.
          </Text>
        )}

        <CompanyLinkedInSlugField error={errors.linkedinSlug} />
        <CompanyNameField error={errors.name} />
        <CompanyDomainField error={errors.domain} />
        <CompanyImageUrlField error={errors.imageUrl} />
        <CompanyResumeBooksField
          error={errors.resumeBookIds}
          resumeBooks={resumeBooks}
        />

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Create</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
