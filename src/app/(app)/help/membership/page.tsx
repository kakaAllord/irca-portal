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
          opening on those who want to join the church, searched as you type. The funnel beside the
          search holds the other filters: saved, baptised, gender, age, where they live, how they
          heard. The tabs count each list. A row opens in place with what they told the registration
          form; the name opens their whole record. <strong>Membership → Members</strong> lists only
          the confirmed members, by member number.
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

      <Step n={3} title="Notes">
        <p>
          On their record, <strong>Add note</strong> to write down what the church should know, so
          whoever meets them next knows. Their timeline also shows what Outreach and Communications
          did with them.
        </p>
      </Step>

      <Step n={4} title="Remind people to finish the form">
        <p>
          On Registrations or Members, someone who did not finish has <strong>Copy link</strong>{' '}
          (their own link to carry on) and <strong>Text</strong>. Tick several, or{' '}
          <strong>Tick all on this page</strong>, then <strong>Text the chosen</strong>; or text
          everyone not finished from the bar above the list.
        </p>
        <p>
          The text uses an approved template with their link in it, chosen in the window that opens.
          Its words are written in Communications → Templates and approved by an administrator; each
          person gets it in the language they chose.
        </p>
      </Step>

      <Step n={5} title="Applications">
        <p>
          <strong>Membership → Applications</strong> has two lists:{' '}
          <strong>Waiting application approval</strong> and <strong>Waiting confirmation</strong>.
          Each row shows whether they are saved and baptised. The pastors and the administrators
          approve with the round tick, or reject with the round cross. Once approved,{' '}
          <strong>Confirm</strong> whenever the pastors are ready; it gives the new member their
          number, and they move to Members. Enter one by hand with{' '}
          <strong>+ New application</strong>; ticking &ldquo;join the church&rdquo; on the form
          applies by itself.
        </p>
      </Step>

      <Step n={6} title="The foundation class on Google Meet">
        <p>
          Each group of new converts meets on its own day and Meet link. In{' '}
          <strong>Membership → Discipleship</strong>, start one with <strong>+ New group</strong>,
          then <strong>+ New session</strong> beside it: choose the group attending, the day, the
          time and the Meet link (the group&apos;s link is filled in), and the approved template to
          text the group with. The group is texted straight away, and the template is remembered for
          the next session. The <strong>Group</strong> dropdown at the top shows one group&apos;s
          sessions and register; under <strong>People</strong>, everyone on the journey shows as a{' '}
          <strong>Board</strong> or a <strong>Table</strong>.
        </p>
        <p>
          After the session, <strong>Copy attendance link</strong> and paste it into the Meet chat.
          Each person opens it, chooses their name and confirms; a phone can mark only one person
          per session. The <strong>Class register</strong> shows their marks, and you can still tap
          a box for anyone who could not. Six sessions finish the class; two missed in a row is
          flagged as worth a visit.
        </p>
      </Step>
    </Guide>
  );
}
