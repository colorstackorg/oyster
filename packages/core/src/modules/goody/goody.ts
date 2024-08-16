const GOODY_URL = 'https://api.ongoody.com/v1/order_batches';

// Environment Variables
const GOODY_TOKEN = ''; // Replace with actual API key

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
  recipients: Recipient[];
  cart: {
    items: CartItem[];
  };
  message: string;
}

async function createOrderBatch() {
  const payload: CreateOrderBatchPayload = {
    from_name: 'ColorStack',
    send_method: 'email_and_link', // An email notification will be sent to the recipient of the gift. //
    recipients: [
      {
        first_name: '',
        last_name: '',
        email: '',
      },
    ],
    cart: {
      items: [
        {
          product_id: 'ENTER_PRODUCT_ID_HERE', // Enter Product ID for Doordash GC from Goody, found in Developer Mode //
          quantity: 75,
        },
      ],
    },
    message: 'Thank you for Joining ColorStack Fam Friday!',
  };

  try {
    const response = await fetch(GOODY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GOODY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(`Error: ${errorData.message}`);
    }

    const data = await response.json();

    console.log('Order batch created successfully:', data);
  } catch (error) {
    const err = error as Error;

    console.error('Error creating order batch:', err.message);
  }
}

createOrderBatch();
