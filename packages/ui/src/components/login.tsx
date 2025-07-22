import { type PropsWithChildren } from 'react';
import { Mail } from 'react-feather';

import { Text } from './text';
import { cx } from '../utils/cx';

export const Login = () => {};

type _LoginButtonProps = PropsWithChildren<{
  external?: boolean;
  href: string;
}>;

Login._Button = function _Button({
  children,
  external = false,
  href,
}: _LoginButtonProps) {
  return (
    <li>
      <a
        className={cx(
          'flex items-center gap-3 rounded-lg border border-solid border-gray-300 p-2 no-underline',
          'hover:cursor-pointer hover:bg-gray-100',
          'active:bg-gray-200'
        )}
        href={href}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    </li>
  );
};

Login.ButtonGroup = function ButtonGroup({ children }: PropsWithChildren) {
  return <ul className="flex flex-col gap-2">{children}</ul>;
};

type LoginButtonProps = {
  href: string;
};

Login.GoogleButton = function GoogleButton({ href }: LoginButtonProps) {
  return (
    <Login._Button href={href} external>
      <GoogleLogo />
      Log In with Google
    </Login._Button>
  );
};

Login.LinkedinButton = function LinkedinButton({ href }: LoginButtonProps) {
  return (
    <Login._Button href={href} external>
      Log In with LinkedIn
    </Login._Button>
  );
};

Login.OtpButton = function OtpButton({ href }: LoginButtonProps) {
  return (
    <Login._Button href={href}>
      <Mail className="h-6 w-6" />
      Log In with OTP
    </Login._Button>
  );
};

Login.SlackButton = function SlackButton({ href }: LoginButtonProps) {
  return (
    <Login._Button href={href} external>
      <SlackLogo />
      Log In with Slack
    </Login._Button>
  );
};

Login.Title = function Title({ children }: PropsWithChildren) {
  return <Text variant="lg">{children}</Text>;
};

// SVGs

function GoogleLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 32 32"
      className="h-6 w-6"
    >
      <defs>
        <path
          id="A"
          d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
        />
      </defs>

      <clipPath id="B">
        <use xlinkHref="#A" />
      </clipPath>

      <g transform="matrix(.727273 0 0 .727273 -.954545 -1.45455)">
        <path d="M0 37V11l17 13z" clipPath="url(#B)" fill="#fbbc05" />
        <path
          d="M0 11l17 13 7-6.1L48 14V0H0z"
          clipPath="url(#B)"
          fill="#ea4335"
        />
        <path
          d="M0 37l30-23 7.9 1L48 0v48H0z"
          clipPath="url(#B)"
          fill="#34a853"
        />
        <path d="M48 48L17 24l-4-3 35-10z" clipPath="url(#B)" fill="#4285f4" />
      </g>
    </svg>
  );
}

function SlackLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 60 60"
      className="h-6 w-6"
    >
      <path
        d="M22,12 a6,6 0 1 1 6,-6 v6z M22,16 a6,6 0 0 1 0,12 h-16 a6,6 0 1 1 0,-12"
        fill="#36C5F0"
      />
      <path
        d="M48,22 a6,6 0 1 1 6,6 h-6z M32,6 a6,6 0 1 1 12,0v16a6,6 0 0 1 -12,0z"
        fill="#2EB67D"
      />
      <path
        d="M38,48 a6,6 0 1 1 -6,6 v-6z M54,32 a6,6 0 0 1 0,12 h-16 a6,6 0 1 1 0,-12"
        fill="#ECB22E"
      />
      <path
        d="M12,38 a6,6 0 1 1 -6,-6 h6z M16,38 a6,6 0 1 1 12,0v16a6,6 0 0 1 -12,0z"
        fill="#E01E5A"
      />
    </svg>
  );
}
