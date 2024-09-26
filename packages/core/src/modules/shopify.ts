import { reportException } from '@/modules/sentry/use-cases/report-exception';
import { fail, type Result, success } from '@/shared/utils/core.utils';
import { RateLimiter } from '@/shared/utils/rate-limiter';

// Environment Variables

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN as string;
const SHOPIFY_STORE_NAME = process.env.SHOPIFY_STORE_NAME as string;

// Constants

const SHOPIFY_API_URL = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2024-07`;

const SHOPIFY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
};

/**
 * @see https://docs.anthropic.com/en/api/rate-limits#rate-limits
 */
const shopifyRateLimiter = new RateLimiter('shopify:requests', {
  rateLimit: 2,
  rateLimitWindow: 1,
});

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

// Customers

type CreateCustomerResult = Result<{ id: number }>;

/**
 * Creates a new customer.
 *
 * @param customer - The customer to create.
 * @returns A result object w/ the customer's ID, if successful.
 *
 * @see https://shopify.dev/docs/api/admin-rest/2024-07/resources/customer#post-customers
 */
async function getOrCreateCustomer(
  customer: Customer
): Promise<CreateCustomerResult> {
  const customerResult = await getCustomerByEmail(customer.email);

  if (!customerResult.ok) {
    return fail(customerResult);
  }

  if (customerResult.data) {
    return success({ id: customerResult.data.id });
  }

  const body = JSON.stringify({
    customer: {
      email: customer.email,
      first_name: customer.firstName,
      last_name: customer.lastName,
    },
  });

  await shopifyRateLimiter.process();

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

type GetCustomerByEmailResult = Result<{ id: number } | null>;

async function getCustomerByEmail(
  email: string
): Promise<GetCustomerByEmailResult> {
  await shopifyRateLimiter.process();

  const response = await fetch(
    SHOPIFY_API_URL + `/customers/search.json?query=email:${email}`,
    {
      headers: SHOPIFY_HEADERS,
      method: 'GET',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error('Failed to search for Shopify customer.');

    reportException(error, {
      data,
      status: response.status,
    });

    return fail({
      code: response.status,
      error: error.message,
    });
  }

  const [customer] = data.customers as Array<{ id: number }>;

  if (!customer) {
    return success(null);
  }

  return success({ id: customer.id });
}

// Gift Cards

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
  customer: Customer;
  expiresOn: string;
  initialValue: string;
  note?: string;
};

type CreateGiftCardResult = Result<{}>;

/**
 * Creates a new gift card and assigns it to a customer.
 *
 * @param card - The gift card to create.
 * @returns A result indicating the success or failure of the operation.
 *
 * @see https://shopify.dev/docs/api/admin-rest/2024-07/resources/gift-card#post-gift-cards
 */
export async function createGiftCard(
  card: GiftCard
): Promise<CreateGiftCardResult> {
  const customerResult = await getOrCreateCustomer(card.customer);

  if (!customerResult.ok) {
    return fail(customerResult);
  }

  const body = JSON.stringify({
    gift_card: {
      customer_id: customerResult.data.id,
      expires_on: card.expiresOn,
      initial_value: card.initialValue,
      note: card.note,
    },
  });

  await shopifyRateLimiter.process();

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
