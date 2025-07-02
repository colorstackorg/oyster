import { type useLoaderData } from '@remix-run/react';

export type SerializeFrom<T> = ReturnType<typeof useLoaderData<T>>;
