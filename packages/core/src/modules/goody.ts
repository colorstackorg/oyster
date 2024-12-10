import { reportException } from '@/infrastructure/sentry';
import { fail, type Result, success } from '@/shared/utils/core';

// Constants

const GOODY_API_TOKEN = process.env.GOODY_API_TOKEN;
const GOODY_CARD_ID = process.env.GOODY_CARD_ID;
const GOODY_DOORDASH_PRODUCT_ID = process.env.GOODY_DOORDASH_PRODUCT_ID;

// Core

type GoodyRecipient = {
  first_name: string;
  last_name: string;
  email: string;
};

type GoodyItem = {
  product_id: string;
  quantity: number;
};

type GoodyOrderBatchPayload = {
  card_id: string;
  cart: { items: GoodyItem[] };
  from_name: string;
  message: string;
  recipients: GoodyRecipient[];

  /**
   * Determines how the recipient will receive the gift.
   *
   * - `email_and_link`: Sends email w/ a link to the recipient.
   * - `link_multiple_custom_list`: Doesn't send anything, has link ready.
   *
   * @default 'email_and_link'
   */
  send_method: 'email_and_link' | 'link_multiple_custom_list';
};

type CreateGoodyOrderInput = Pick<
  GoodyOrderBatchPayload,
  'message' | 'recipients'
>;

/**
 * Creates a new Goody order batch.
 *
 * @param input - The message and recipients to send the gift to.
 *
 * @see https://developer.ongoody.com/commerce-api/create-an-order
 * @see https://developer.ongoody.com/api-reference/order-batches/create-an-order-batch
 */
export async function createGoodyOrder(
  input: CreateGoodyOrderInput
): Promise<Result> {
  const payload: GoodyOrderBatchPayload = {
    card_id: GOODY_CARD_ID as string,
    cart: {
      items: [
        {
          product_id: GOODY_DOORDASH_PRODUCT_ID as string,
          quantity: 1,
        },
      ],
    },
    from_name: 'The ColorStack Community Team',
    message: input.message,
    recipients: input.recipients,
    send_method: 'email_and_link',
  };

  const response = await fetch('https://api.ongoody.com/v1/order_batches', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${GOODY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error('Failed to create Goody order.');

    reportException(error, {
      data,
      status: response.status,
    });

    return fail({
      code: response.status,
      error: error.message,
    });
  }

  console.log('Goody batch order created!', data);

  return success({});
}
