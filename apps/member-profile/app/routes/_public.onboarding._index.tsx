import { json, type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { Link, Outlet } from '@remix-run/react';
import { ArrowLeft, ArrowRight } from 'react-feather';
import { z } from 'zod';

import { Button, Public, Text, type TextProps } from '@oyster/ui';

import { Route } from '@/shared/constants';

export async function loader() {
  return redirect(Route['/onboarding/general']);
}
