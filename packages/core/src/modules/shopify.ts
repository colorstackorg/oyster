import { reportException } from '@/modules/sentry/use-cases/report-exception';
import { fail, type Result, success } from '@/shared/utils/core.utils';

// Environment Variables

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN as string;
const SHOPIFY_STORE_NAME = process.env.SHOPIFY_STORE_NAME as string;

// Constants

const SHOPIFY_API_URL = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2024-07`;

const SHOPIFY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
};

// Core

/**
 * The Customer resource stores information about a shop's customers, such as
 * their contact details, their order history, and whether they've agreed to
 * receive email marketing.
 *
 * @see https://shopify.dev/docs/api/admin-rest/2024-07/resources/customer#resource-object
 */
type Customer = {
  email: string;
  firstName: string;
  lastName: string;
};

/**
 * A gift card is an alternative payment method. Each gift card has a unique
 * code that is entered during checkout. Its balance can be redeemed over
 * multiple checkouts. Optionally, a gift card can assigned to a specific
 * customer. Gift card codes cannot be retrieved after they're created—only the
 * last four characters can be retrieved.
 *
 * @see https://shopify.dev/docs/api/admin-rest/2024-07/resources/gift-card#resource-object
 */
type GiftCard = {
  code: string;
  customer: Customer;
  expiresOn: string;
  initialValue: string;
  note: string;
  sendEmailAt: string;
};

/**
 * Creates a new gift card and assigns it to a customer.
 *
 * @param card - The gift card to create.
 * @returns A result indicating the success or failure of the operation.
 *
 * @see https://shopify.dev/docs/api/admin-rest/2024-07/resources/gift-card#post-gift-cards
 */
export async function createGiftCard(card: GiftCard): Promise<Result> {
  const customerResult = await createCustomer(card.customer);

  if (!customerResult.ok) {
    return fail(customerResult);
  }

  const body = JSON.stringify({
    gift_card: {
      code: card.code,
      customer_id: customerResult.data.id,
      expires_on: card.expiresOn,
      initial_value: card.initialValue,
      note: card.note,
      send_email_at: card.sendEmailAt,
    },
  });

  const response = await fetch(SHOPIFY_API_URL + '/gift_cards.json', {
    body,
    headers: SHOPIFY_HEADERS,
    method: 'POST',
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

  console.log('Shopify gift card created!', data);

  return success({});
}

type CreateCustomerResult = Result<{ id: number }>;

/**
 * Creates a new customer.
 *
 * @param customer - The customer to create.
 * @returns A result object w/ the customer's ID, if successful.
 *
 * @see https://shopify.dev/docs/api/admin-rest/2024-07/resources/customer#post-customers
 */
async function createCustomer(
  customer: Customer
): Promise<CreateCustomerResult> {
  const body = JSON.stringify({
    customer: {
      email: customer.email,
      first_name: customer.firstName,
      last_name: customer.lastName,
    },
  });

  const response = await fetch(SHOPIFY_API_URL + '/customers.json', {
    body,
    headers: SHOPIFY_HEADERS,
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error('Failed to create Shopify customer.');

    reportException(error, {
      data,
      status: response.status,
    });

    return fail({
      code: response.status,
      error: error.message,
    });
  }

  console.log('Shopify customer created!', data);

  const id = data.customer.id as number;

  return success({ id });
}
