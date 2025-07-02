import { type useLoaderData } from 'react-router';

export type SerializeFrom<T> = ReturnType<typeof useLoaderData<T>>;
