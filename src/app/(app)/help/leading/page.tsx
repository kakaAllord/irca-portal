import type { Metadata } from 'next';
import { Guide, Step } from '../Guide';

export const metadata: Metadata = { title: 'Leading a department' };

export default function LeadingGuidePage() {
  return (
    <Guide
      href="/help/leading"
      title="Leading a department"
      intro="For every department leader: your department's page, its members, and its messages."
    >
      <Step n={1} title="Your department's page">
        <p>
          <strong>My departments</strong> lists what you lead and your position there. Open one to
          see its members and its leaders. An administrator names leaders and chooses their
          positions.
        </p>
      </Step>

      <Step n={2} title="Add and remove members">
        <p>
          <strong>Add someone to</strong> your department from the church&apos;s People list: anyone
          who has filled in the whole registration form. Someone who has not is asked to register
          first. <strong>Remove</strong> takes them out; the record that they were in it is kept.
        </p>
        <p>
          Finance, Communications and Outreach are different: being in them opens a portal, so an
          administrator adds and removes their members.
        </p>
      </Step>

      <Step n={3} title="Message your department">
        <p>
          <strong>Messages</strong>, on your department&apos;s page, writes to the whole department
          with words Communications and an administrator have approved. Before it sends, you see how
          many people, the words, and the cost.
        </p>
      </Step>

      <Step n={4} title="Write your own words">
        <p>
          <strong>Templates → + New template</strong>: the words in Swahili, English and French,
          then <strong>Ask for approval</strong>. Communications passes them, then an administrator
          approves them, and from then on you send them without asking. <strong>Recurring</strong>{' '}
          sends approved words on set days by itself.
        </p>
      </Step>
    </Guide>
  );
}
