import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';

import { ensureUserAuthenticated } from '@/shared/session.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'ColorStack Mentor Platform' },
    {
      name: 'description',
      content: 'Welcome to the ColorStack Mentor Platform!',
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return null;
}

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-4xl font-bold">
        Welcome to ColorStack Mentor Platform
      </h1>
      <p className="text-lg text-gray-600">
        Connect with mentors and grow your career in tech.
      </p>
    </div>
  );
}
