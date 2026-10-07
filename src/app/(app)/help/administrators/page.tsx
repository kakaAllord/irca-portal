import type { Metadata } from 'next';
import { Guide, Step } from '../Guide';

export const metadata: Metadata = { title: 'For administrators' };

export default function AdministratorsGuidePage() {
  return (
    <Guide
      href="/help/administrators"
      title="For administrators"
      intro="You run the church's administration: people, departments, and the approvals nobody else gives."
    >
      <Step n={1} title="Start from the Overview">
        <p>
          <strong>Admin → Overview</strong> shows what needs you: change requests, templates and
          emergency messages and membership applications waiting, registrations, the departments,
          this month&apos;s money and texts, and invitations nobody accepted. Every number opens the
          page where it is handled. An emergency message that has waited more than fifteen minutes
          is drawn in red.
        </p>
      </Step>

      <Step n={2} title="Give someone access">
        <p>
          A pastor or another administrator: <strong>Admin → Users → + Invite user</strong>,
          their email and name, and tick what they are. They get an email and choose their own
          password.
        </p>
        <p>
          Someone in Finance, Communications or Outreach gets that portal by being in the
          department. In <strong>Admin → Departments</strong>, open the department and add them as a
          member, or name them a leader. Someone with no account is sent an invitation. Ending their
          place takes the portal away at once; their account stays.
        </p>
      </Step>

      <Step n={3} title="Departments and positions">
        <p>
          A leader is named from the confirmed members, with a position chosen from the list. If the
          position you type is not there, press <strong>+ Add position</strong> and carry on. The{' '}
          <strong>Positions</strong> tab puts the list in order and renames or turns off a position;
          nothing is ever deleted.
        </p>
        <p>
          Leaders of departments without a portal add their own members. For Finance, Communications
          and Outreach, you do, because being in them opens a portal.
        </p>
      </Step>

      <Step n={4} title="Decide requests, templates and emergency messages">
        <p>
          <strong>Admin → Requests</strong> has three tabs. <strong>Changes</strong>: a Finance
          entry or pledge payment someone asked to correct. <strong>Templates</strong>: words a
          department or Communications wants to send, already passed by Communications.{' '}
          <strong>Emergency messages</strong>: words no template covers, held until you let them go
          or stop them. You are told by text or email the moment one waits. Nobody decides their own
          request.
        </p>
      </Step>

      <Step n={5} title="Membership, and seeing as someone">
        <p>
          You can do everything in Membership the pastors can, deciding applications included:
          approve, reject, and confirm whenever the pastors are ready. Prayer requests are the
          pastors&apos; alone.
        </p>
        <p>
          To see what someone sees, press the arrow beside their name in People. Nothing can be
          changed while you look, and they are not told. <strong>Back to my view</strong>, in the
          yellow bar, returns you. You cannot view as a pastor.
        </p>
      </Step>
    </Guide>
  );
}
