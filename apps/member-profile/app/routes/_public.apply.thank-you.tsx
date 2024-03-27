import { json } from '@remix-run/node';

import { Link, Text } from '@colorstack/core-ui';

export async function loader() {
  return json({});
}

export default function ThankYou() {
  return (
    <>
      <Text>Thank you for applying to ColorStack!</Text>

      <Text>
        If you don't immediately receive an email from us confirming the receipt
        of your application, please email{' '}
        <Link href="mailto:membership@colorstack.org">
          membership@colorstack.org
        </Link>
        .
      </Text>
    </>
  );
}
