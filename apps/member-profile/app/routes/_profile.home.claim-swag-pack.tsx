export async function loader() {
  return new Response(
    'If you were activated recently, you should have received an email with a gift card to our merch store. Please reach out to the ColorStack team if you need further assistance.',
    { status: 404 }
  );
}
