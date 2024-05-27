import { ENV } from '@/shared/env';

type ShopifyGiftCardInput = {
  amount: number;
  firstName: string;
  lastName: string;
  email: string;
};

async function createCustomer(
  firstName: string,
  lastName: string,
  email: string
) {
  const url = `${ENV.SHOPIFY_STORE_URL}customers.json`;

  const body = {
    customer: {
      first_name: firstName,
      last_name: lastName,
      email: email,
      send_email_invite: true,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'X-Shopify-Access-Token': ENV.SHOPIFY_ADMIN_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  //How should I handle errors here?

  if (data['errors']) {
    console.log(data['errors']);

    return null;
  } else {
    return data['customer']['id'];
  }
}

async function createGiftCard(amount: number, recipientId: number) {
  const url = `${ENV.SHOPIFY_STORE_URL}gift_cards.json`;

  const body = {
    gift_card: {
      initial_value: amount,
      recipient_id: recipientId,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'X-Shopify-Access-Token': ENV.SHOPIFY_ADMIN_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  //How should I handle errors here? Can't really test here because I don't have a PLUS account
}

export async function sendShopifyGiftCard({
  amount,
  firstName,
  lastName,
  email,
}: ShopifyGiftCardInput) {
  const recipientId = await createCustomer(firstName, lastName, email);

  if (!recipientId) {
    return 'failed';
  }

  await createGiftCard(amount, recipientId);
}
