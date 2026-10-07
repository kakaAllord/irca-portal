import type { Metadata } from 'next';
import { Guide, Step } from '../Guide';

export const metadata: Metadata = { title: 'For the pastors' };

export default function PastorsGuidePage() {
  return (
    <Guide
      href="/help/pastors"
      title="For the pastors"
      intro="The administrators and the departments do most of the work. These are the things you do, and where to see the rest."
    >
      <Step n={1} title="Decide membership applications">
        <p>
          <strong>Membership → Applications</strong> lists the people asking to become members. Open
          one, read what they told the church, and approve it with the round tick, or reject it with
          the round cross and a reason. The administrators can decide them too, so an application
          does not have to wait for you; the activity log keeps who decided each one.
        </p>
        <p>
          Approved applications wait in the <strong>Approved</strong> tab until you choose{' '}
          <strong>Confirm</strong>, whenever you are ready. Confirming gives them their member
          number.
        </p>
      </Step>

      <Step n={2} title="Read prayer requests">
        <p>
          <strong>Membership → Prayers</strong> shows what people asked you to pray for when they
          registered, newest first, one card each with their name, their phone (tap it to call) and
          when they wrote it. Search by name, or choose a month. The card opens the person.
        </p>
        <p>
          Only the pastors see this page. Administrators never do, and nothing on it can be printed
          or sent anywhere.
        </p>
      </Step>

      <Step n={3} title="Each department at a glance">
        <p>
          <strong>Departments</strong> in the sidebar opens a list of every department. Choose one
          to see its summary for this month, last month or this year (for Finance: income, spending
          and pledges; for Communications: messages and what they cost; for Outreach: GO days and
          people reached), then its leaders with their positions and its members.
        </p>
        <p>
          Nothing there can be changed. On Finance&apos;s summary you may open a pledge campaign to
          see who pledged what and what is left.
        </p>
      </Step>

      <Step n={4} title="See what someone in a department sees">
        <p>
          Beside each leader and member who can sign in there is an arrow going out of a box. Press
          it to see the portal exactly as they do, to help them with a question. Nothing can be
          changed while you look, and they are not told. The yellow bar at the top has{' '}
          <strong>Back to my view</strong>, which returns you to the department you were on.
        </p>
      </Step>

      <Step n={5} title="Everything else in Membership">
        <p>
          You see all of Membership: members, their journey, visits and calls, the foundation class.
          The administrators keep it up to date; the Membership guide explains each page if you need
          it.
        </p>
      </Step>
    </Guide>
  );
}
