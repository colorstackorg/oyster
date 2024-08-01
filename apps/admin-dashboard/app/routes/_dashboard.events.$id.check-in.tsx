import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import QRCode from 'qrcode';

import { Modal } from '@oyster/ui';

import { getEvent } from '@/admin-dashboard.server';
import { Route } from '@/shared/constants';
import { ENV } from '@/shared/constants.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const event = await getEvent(params.id as string, ['events.id'], {
    type: 'irl',
  });

  if (!event) {
    throw new Response(null, { status: 404 });
  }

  const code = await QRCode.toDataURL(
    `${ENV.MEMBER_PROFILE_URL}/events/${event.id}/check-in`,
    { width: 400 }
  );

  return json({
    code,
  });
}

export default function EventCheckInQR() {
  const { code } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/events']} size="400">
      <img alt="QR Code" className="mx-auto w-fit" src={code} />
    </Modal>
  );
}
