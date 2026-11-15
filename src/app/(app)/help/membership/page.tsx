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
          <strong>Membership → Registrations</strong> lists everyone who has ever registered and
          what they chose on the form, searched as you type. The chips under the search narrow it to
          those joining the church, those <strong>not joining the church</strong>, or those who did
          not finish, each with its count. The funnel beside the search holds the other filters:
          what they chose on the form, saved, baptised, gender, age, where they live, how they
          heard. A row opens in place with what they told the registration form; the name opens
          their whole record. <strong>Membership → Members</strong> lists only the confirmed
          members, by member number.
        </p>
        <p>
          Someone who came to the office rather than filling in the form:{' '}
          <strong>+ Add person</strong>.
        </p>
      </Step>

      <Step n={2} title="Salvation and baptism">
        <p>
          <strong>Membership → Salvation &amp; baptism</strong> has two lists.{' '}
          <strong>Need salvation</strong> is everyone who asked to give their life to Christ, or
          said they are not saved yet. <strong>Need baptism</strong> is everyone saved, or asking to
          be baptised, who is not baptised yet.
        </p>
        <p>
          When it has happened, flip the switch on their line. <strong>Saved</strong> moves them to
          Need baptism; <strong>Baptised</strong> takes them off the list. A bar at the bottom says
          where they went, with <strong>Undo</strong> for a wrong tap. The Membership dashboard
          shows how many are waiting on each list.
        </p>
      </Step>

      <Step n={3} title="Move them along the journey">
        <p>
          A person&apos;s record shows where they are: visitor, new convert, foundation class,
          awaiting baptism, membership review, confirmed member. They move one step at a time, or
          one step back with a reason, and every move says who made it.
        </p>
      </Step>

      <Step n={4} title="Notes">
        <p>
          On their record, <strong>Add note</strong> to write down what the church should know, so
          whoever meets them next knows. Their timeline also shows what Outreach and Communications
          did with them.
        </p>
      </Step>

      <Step n={5} title="Remind people to finish the form">
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

      <Step n={6} title="Applications">
        <p>
          <strong>Membership → Applications</strong> has two lists:{' '}
          <strong>Waiting application approval</strong> and <strong>Waiting confirmation</strong>.
          Each row shows whether they are saved and baptised. The pastors approve with the round
          tick, or reject with the round cross. Once approved, an administrator chooses{' '}
          <strong>Confirm by message</strong> and sends the person an approved message; sending it
          confirms them, gives them their member number, and moves them to Members. Enter one by
          hand with <strong>+ New application</strong>; ticking &ldquo;join the church&rdquo; on the
          form applies by itself.
        </p>
      </Step>

      <Step n={7} title="The foundation class on Google Meet">
        <p>
          Each group of new converts meets on its own day and Meet link. In{' '}
          <strong>Membership → Discipleship</strong>, start one with <strong>+ New group</strong>,
          then <strong>+ New session</strong> beside it: choose the group, the day, the time and the
          Meet link (the group&apos;s link is filled in), and the approved template to text the
          group with. The group is texted straight away, and the template is remembered for the next
          session. Under <strong>Remind them</strong>, add as many reminders as you like, each a day
          and time between now and the session; the group gets the same text again then, and each
          session lists its reminders and which have gone. The <strong>Group</strong> dropdown at
          the top shows one group&apos;s sessions; under <strong>People</strong>, everyone on the
          journey is listed with their stage.
        </p>
        <p>
          Attendance is not kept. When someone has finished the class, open their record and move
          them on to awaiting baptism.
        </p>
      </Step>
    </Guide>
  );
}
