import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { ColorStackError } from '@/shared/errors';

const GOODY_URL = 'https://api.ongoody.com/v1/order_batches';
const GOODY_TOKEN = 'GOODY_API_TOKEN'; // Replace with ENV.GOODY_API_TOKEN //

interface Recipient {
  first_name: string;
  last_name: string;
  email: string;
}

interface CartItem {
  product_id: string;
  quantity: number;
}

interface CreateOrderBatchPayload {
  from_name: string;
  send_method: string;
  recipient: Recipient;
  cart: {
    items: CartItem[];
  };
  message: string;
}

export async function createGoodyOrder(id: string) {
  const [student] = await db
    .selectFrom('students')
    .select(['firstName', 'lastName', 'email', 'slackId'])
    .where('id', '=', id)
    .execute();
  const payload: CreateOrderBatchPayload = {
    from_name: 'ColorStack',
    send_method: 'email_and_link', // An email notification will be sent to the recipient of the gift. //
    recipient: {
      first_name: student.firstName,
      last_name: student.lastName,
      email: student.email,
    },
    cart: {
      items: [
        {
          product_id: 'GOODY_DOORDASH_PRODUCT_ID', // Enter Product ID for Doordash GC from Goody, found in Developer Mode //
          quantity: 1,
        },
      ],
    },
    message: 'Thank you for Joining ColorStack Fam Friday!',
  };

  const response = await fetch(GOODY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GOODY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Error creating order batch:')
      .withContext({ data, status: response.status })
      .report();
  } else {
    console.log('Order batch created successfully:', data);

    job('notification.slack.send', {
      channel: student.slackId || '',
      message: `Thank you for your engagement in ColorStack's Fam Friday! You have been awarded a Gift Card 🎉`,
      workspace: 'regular',
    });
  }
}
