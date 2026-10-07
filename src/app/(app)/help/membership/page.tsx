import type { Metadata } from 'next';
import { Guide, Step } from '../Guide';

export const metadata: Metadata = { title: 'Membership' };

export default function MembershipGuidePage() {
  return (
    <Guide
      href="/help/membership"
      title="Membership"
      intro="For the administrators and the pastors: everyone the church knows, from their first visit to membership."
    >
      <Step n={1} title="Find a person">
        <p>
          <strong>Membership → Registrations</strong> lists everyone who has ever registered,
          searched as you type. The funnel beside the search holds the other filters: saved,
          baptised, gender, age, where they live, how they heard. The tabs count each list. A row
          opens in place with what they told the registration form; the name opens their whole
          record. <strong>Membership → Members</strong> lists only the confirmed members, by member
          number.
        </p>
        <p>
          Someone who came to the office rather than filling in the form:{' '}
          <strong>+ Add person</strong>.
        </p>
      </Step>

      <Step n={2} title="Move them along the journey">
        <p>
          A person&apos;s record shows where they are: visitor, new convert, foundation class,
          awaiting baptism, membership review, confirmed member. They move one step at a time, or
          one step back with a reason, and every move says who made it.
        </p>
      </Step>

      <Step n={3} title="Visits, calls and notes">
        <p>
          On their record, <strong>Log call</strong>, <strong>Log visit</strong> or{' '}
          <strong>Add note</strong> after each contact, so whoever calls next knows. Their timeline
          also shows what Outreach and Communications did with them.
        </p>
        <p>
          Someone who did not finish the form can be sent their own link, by copying it or by
          opening WhatsApp with the message already written in their language.
        </p>
      </Step>

      <Step n={4} title="Applications">
        <p>
          <strong>Membership → Applications</strong>: enter an application with{' '}
          <strong>+ New application</strong>. The pastors and the administrators approve it with the
          round tick, or reject it with the round cross. Once approved, <strong>Confirm</strong>{' '}
          whenever the pastors are ready; it gives the new member their number.
        </p>
      </Step>

      <Step n={5} title="The foundation class">
        <p>
          <strong>Membership → Discipleship</strong> opens the{' '}
          <strong>Foundation class register</strong>: tap a box to mark a session attended or
          missed, or mark the whole session at once, then <strong>Save the register</strong>. Six
          sessions finish the class. Two missed in a row is flagged as worth a visit.
        </p>
      </Step>
    </Guide>
  );
}
