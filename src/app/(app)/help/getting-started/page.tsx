import type { Metadata } from 'next';
import { Guide, Step } from '../Guide';

export const metadata: Metadata = { title: 'Getting started' };

export default function GettingStartedPage() {
  return (
    <Guide
      href="/help/getting-started"
      title="Getting started"
      intro="Everything you need on your first day with the IRCA portal."
    >
      <Step n={1} title="Accept your invitation">
        <p>
          An administrator invites you by email. Open the link in it: the page says{' '}
          <strong>Accept your invitation</strong>. <strong>Choose a password</strong> of at least 10
          characters. A short sentence you will remember works well; a password that appears in
          lists of stolen passwords is refused.
        </p>
        <p>
          The link works once, for 72 hours. If it has run out, ask the administrator to resend it.
        </p>
      </Step>

      <Step n={2} title="Sign in">
        <p>
          Go to the portal&apos;s address and sign in with your email and password. After five wrong
          passwords in a row your account is locked for fifteen minutes, then opens again by itself.
        </p>
        <p>
          You stay signed in for up to seven days, or until twelve hours pass without using it. On a
          shared computer, sign out with the door beside your name, at the foot of the sidebar, when
          you finish.
        </p>
      </Step>

      <Step n={3} title="If you forget your password">
        <p>
          On the sign-in page, choose <strong>Forgot your password?</strong> and give your email. A
          link arrives within a minute or two. It works once, for one hour, and choosing a new
          password signs you out everywhere else, in case someone else had it.
        </p>
        <p>You get the same answer whether or not the email has an account, on purpose.</p>
      </Step>

      <Step n={4} title="What the sidebar shows you">
        <p>
          Only what you use. Pastors and administrators see Membership and every department;
          administrators also see Admin. The people in Finance, Communications and Outreach see
          their department&apos;s portal because they are in it, and a leader of any department sees{' '}
          <strong>My departments</strong>. If you expect a page and cannot see it, ask an
          administrator. It is not a fault.
        </p>
        <p>
          A number beside <strong>Requests</strong> means something is waiting for you. Anything you
          fill in opens in a panel from the right, over the page you were on. Fields with a red star
          must be filled in, and a greyed-out <strong>Save</strong> says what it is waiting for when
          you point at it. The button beside the church&apos;s name folds the sidebar away to icons;
          the logo opens it again.
        </p>
      </Step>

      <Step n={5} title="Help, your account, and signing out">
        <p>
          The <strong>?</strong> at the top of every page opens the guide for the part of the portal
          you are in. The guides are also listed under Help, one for each thing you use, and each
          prints as one page.
        </p>
        <p>
          At the foot of the sidebar, click your name for <strong>Account</strong>: your name and
          phone, your password, and the browsers you are signed in on, each of which you can sign
          out. The door beside your name signs you out in one click.
        </p>
      </Step>

      <Step n={6} title='What "viewing as" means'>
        <p>
          To answer a question like &ldquo;why can&apos;t I see this page?&rdquo;, an administrator
          (or, for the people in departments, a pastor) can look at the portal exactly as you see
          it, from an arrow beside your name. While they do, nothing can be changed: not by them,
          and not in your name. The portal is built so that it cannot be. If someone says they
          viewed the portal as you, that is all it means.
        </p>
        <p>
          If you are the one viewing, a yellow bar stays at the top of every page. Its{' '}
          <strong>Back to my view</strong> takes you back to the page you started from.
        </p>
      </Step>
    </Guide>
  );
}
