import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import React, { useState } from 'react';

import { getApplication, rejectApplication } from '@oyster/core/applications';
import { Button, Dropdown, Form, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

type RejectionReason =
  | 'Not an undergrad student'
  | 'Incorrect or suspicious LinkedIn'
  | 'Not the right major'
  | 'Not enrolled in US or Canada';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  const application = await getApplication(params.id as string, [
    'applications.firstName',
    'applications.lastName',
  ]);

  if (!application) {
    throw new Response(null, { status: 404 });
  }

  return json({
    application,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  const formData = new URLSearchParams(await request.text());
  const reason = formData.get('rejectionReason') || '';

  try {
    await rejectApplication(params.id as string, reason, user(session));

    console.log('Rejection Reason: ' + reason);

    toast(session, {
      message: 'Application has been rejected.',
    });

    return redirect(Route['/applications'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

export default function RejectApplicationPage() {
  const { application } = useLoaderData<typeof loader>();
  const { error } = useActionData<typeof action>() || {};
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<RejectionReason | ''>(
    ''
  );

  const handleSelectReason = (reason: RejectionReason) => {
    setSelectedReason(reason);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <Modal.Header>
        <Modal.Title>Reject Application</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Just confirming - do you want to reject the application of{' '}
        {application.firstName} {application.lastName}? If so, please select a
        reason for rejecting this application.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <label htmlFor="rejectionReason">Rejection Reason:</label>
        <Dropdown.Container onClose={() => setIsDropdownOpen(false)}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full rounded border border-gray-300 bg-white p-2 text-left"
          >
            {selectedReason || 'Select a reason...'}
          </button>
          {isDropdownOpen && (
            <Dropdown align="left">
              <Dropdown.List>
                <Dropdown.Item>
                  <button
                    type="button"
                    className="w-full p-2 text-left"
                    onClick={() =>
                      handleSelectReason('Not an undergrad student')
                    }
                  >
                    Not an undergrad student
                  </button>
                </Dropdown.Item>
                <Dropdown.Item>
                  <button
                    type="button"
                    className="w-full p-2 text-left"
                    onClick={() =>
                      handleSelectReason('Incorrect or suspicious LinkedIn')
                    }
                  >
                    Incorrect or suspicious LinkedIn
                  </button>
                </Dropdown.Item>
                <Dropdown.Item>
                  <button
                    type="button"
                    className="w-full p-2 text-left"
                    onClick={() => handleSelectReason('Not the right major')}
                  >
                    Not the right major
                  </button>
                </Dropdown.Item>
                <Dropdown.Item>
                  <button
                    type="button"
                    className="w-full p-2 text-left"
                    onClick={() =>
                      handleSelectReason('Not enrolled in US or Canada')
                    }
                  >
                    Not enrolled in US or Canada
                  </button>
                </Dropdown.Item>
              </Dropdown.List>
            </Dropdown>
          )}
        </Dropdown.Container>

        {/* Hidden input to capture the selected value for form submission */}
        <input type="hidden" name="rejectionReason" value={selectedReason} />

        <Button.Group>
          <Button type="submit">Reject</Button>
        </Button.Group>
      </RemixForm>
    </>
  );
}
