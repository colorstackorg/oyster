import { Button } from '@react-email/button';
import { Container } from '@react-email/container';
import { Head } from '@react-email/head';
import { Hr } from '@react-email/hr';
import { Html } from '@react-email/html';
import { Img } from '@react-email/img';
import { Link } from '@react-email/link';
import { Preview } from '@react-email/preview';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import React, { PropsWithChildren } from 'react';

type EmailBaseProps<T> = PropsWithChildren<
  T & {
    marginBottom?: '0px' | '16px' | '32px';
    marginTop?: '0px' | '16px' | '32px';
  }
>;

export const Email = () => {};

type EmailButtonProps = PropsWithChildren<{
  href: string;
}>;

Email.Button = function EmailButton({ children, href }: EmailButtonProps) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: '#348e87',
        borderRadius: 100,
        color: 'white',
        cursor: 'pointer',
        fontSize: 16,
        padding: '12px 16px',
      }}
    >
      {children}
    </Button>
  );
};

Email.Divider = function EmailDivider() {
  return <Hr />;
};

type EmailImageProps = {
  borderRadius?: string;
  height: string;
  src: string;
  width: string;
};

Email.Image = function EmailImage({
  borderRadius,
  height,
  src,
  width,
}: EmailImageProps) {
  return (
    <Img
      height={height}
      src={src}
      style={{
        borderRadius,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
      width={width}
    />
  );
};

type EmailLinkProps = PropsWithChildren<{
  href: string;
}>;

Email.Link = function EmailLink({ children, href }: EmailLinkProps) {
  return (
    <Link
      href={href}
      style={{
        color: '#348e87',
        textDecoration: 'underline',
      }}
    >
      {children}
    </Link>
  );
};

Email.Main = function EmailMain({ children }: PropsWithChildren) {
  return (
    <Section
      style={{
        backgroundColor: 'white',
        backgroundImage: `url(https://app.colorstack.io/images/colorstack-background.png)`,
        width: '100%',
      }}
    >
      <Container
        style={{
          backgroundColor: 'white',
          border: `1px #e5e7eb solid`,
          borderRadius: 8,
          fontFamily:
            "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif",
          margin: '48px auto',
          maxWidth: 600,
          padding: 16,
        }}
      >
        <Img
          alt="ColorStack Wordmark"
          src="https://app.colorstack.io/images/colorstack-wordmark.png"
          style={{ marginBottom: 24 }}
          width={160}
        />
        {children}
      </Container>
    </Section>
  );
};

type EmailPreviewProps = {
  children: React.ReactNode;
};

Email.Preview = function EmailPreview({ children }: EmailPreviewProps) {
  return <Preview>{children as string}</Preview>;
};

type EmailSignatureProps = {
  type?: 'colorstack' | 'jehron';
};

const EmailSignatureContent: Record<
  Required<EmailSignatureProps>['type'],
  React.ReactNode
> = {
  colorstack: (
    <>
      Best,
      <br />
      The ColorStack Team
    </>
  ),
  jehron: (
    <>
      Best,
      <br />
      Jehron Petty
      <br />
      Founder & CEO
    </>
  ),
};

Email.Signature = function EmailSignature({
  type = 'colorstack',
}: EmailSignatureProps) {
  return (
    <Email.Text marginBottom="0px" marginTop="32px">
      {EmailSignatureContent[type]}
    </Email.Text>
  );
};

Email.Template = function EmailTemplate({ children }: PropsWithChildren) {
  return (
    <Html>
      <Head />
      {children}
    </Html>
  );
};

type EmailTextProps = EmailBaseProps<{
  fontSize?: '16px' | '32px';
  fontWeight?: '400' | '700';
}>;

Email.Text = function EmailText({
  children,
  fontSize = '16px',
  fontWeight = '400',
  marginBottom,
  marginTop,
}: EmailTextProps) {
  return (
    <Text
      style={{
        fontSize,
        fontWeight,
        marginBottom,
        marginTop,
      }}
    >
      {children}
    </Text>
  );
};
