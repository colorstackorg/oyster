# How to Enable Emails

By the end of this guide, you should be able to send emails in our applications
using your own email account!

## Environment Variables

Our main objective is to set the following environment variables in the
[Admin Dashboard](../apps/admin-dashboard/.env), [API](../apps/api/.env), and
[Member Profile](../apps/member-profile/.env):

```
SMTP_HOST
SMTP_USERNAME
SMTP_PASSWORD
```

`SMTP_HOST` is the server address you are using to send emails. Example:

```
SMTP_HOST=smtp.gmail.com
```

`SMTP_USERNAME` is your email address that you'll be sending emails with.
Example:

```
SMTP_USERNAME=you@gmail.com
```

`SMTP_PASSWORD` is the password to your email account. _Note that for your
security, many services like Gmail won't let you authenticate with just your
plain password, and you have to generate a special password to use for
authentication._ Example:

```
SMTP_PASSWORD=your_password
```

## Choosing an Email

All of us likely have at least 2 email accounts between our personal, school,
and work emails. **Our recommendation is to use your personal email account for
this setup.** If you prefer using your school or work email, it may still work,
but setting it up may be more of a hassle if the account settings are restricted
by your administrators.

## Configuring a Gmail Account

Since most of us likely have a Gmail account, this section will show you how to
set that up to send emails. To protect your account, Gmail doesn't just let you
use your regular password to authenticate, so we'll need to generate what Google
calls an **_app password_**.

### Step 1: Enable 2-Step Verification (2FA)

To generate app passwords, Google requires you to have 2-step verification
enabled. From their
[documentation](https://support.google.com/accounts/answer/185839):

1. Open your [Google Account](https://myaccount.google.com).
2. In the navigation panel, select **Security**.
3. Under “How you sign in to Google,” select **2-Step Verification** -> **Get
   started**.
4. Follow the on-screen steps.

### Step 2: Create an App Password

From Google's [documentation](https://support.google.com/mail/answer/185833):

1. Go to your [Google Account](https://myaccount.google.com).
2. Select **Security**.
3. Under "How you sign in to Google," select **2-Step Verification**.
4. At the bottom of the page, select **App passwords**.
5. Enter a name that helps you remember where you’ll use the app password.
6. Select **Generate**.
7. To enter the app password, follow the instructions on your screen. The app
   password is the 16-character code that generates on your device.
8. Select **Done**.

Note: For Step 5, we recommend that you name your app password
`Oyster (ColorStack)`.

### Step 3: Update Environment Variables

Now that we have our app password, we're ready to update our environment
variables.

In [Admin Dashboard](../apps/admin-dashboard/.env), [API](../apps/api/.env), and
[Member Profile](../apps/member-profile/.env), set the following:

```
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=<YOUR_EMAIL_ADDRESS>
SMTP_PASSWORD=<YOUR_APP_PASSWORD>
```

_Tip: Be sure to remove any spaces from the app password!_

## Reference

- [What is SMTP?](https://aws.amazon.com/what-is/smtp)
