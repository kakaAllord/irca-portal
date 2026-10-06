import type { Metadata } from 'next';
import { Guide, Step } from '../Guide';

export const metadata: Metadata = { title: 'Outreach' };

export default function OutreachGuidePage() {
  return (
    <Guide
      href="/help/outreach"
      title="Outreach"
      intro="For the Outreach team: GO days, the people you reach, and following them up. Leaders plan; everyone records and follows up."
    >
      <Step n={1} title="Plan a GO day (leaders)">
        <p>
          <strong>Outreach → GO days → Plan a GO day</strong>. It starts on the coming Saturday, but
          any date works when an event calls the team out. Then <strong>+ Add a team</strong> for
          each area, starting from a partner group or putting people together for the day.
        </p>
      </Step>

      <Step n={2} title="Record someone on a doorstep">
        <p>
          Open the GO day and press your team&apos;s <strong>Record someone</strong>: their name,
          their number, and whether the church may send them messages (only if they said yes). Your
          team brings the area and who reached them. If the church already knows the number, you are
          asked whether it is the same person instead of making a second one.
        </p>
        <p>How many your team spoke to without taking details goes in the box on the team.</p>
      </Step>

      <Step n={3} title="Follow up">
        <p>
          <strong>Outreach → Follow-up</strong> lists who is still waiting, longest first. Open a
          person and record each call, visit, invitation, or <strong>Came on Sunday</strong>. Their
          timeline shows everything the church has done with them.
        </p>
      </Step>

      <Step n={4} title="Friday training (leaders)">
        <p>
          <strong>Outreach → Training → Plan a training</strong>, then mark who came with the
          register&apos;s boxes. A grid shows who has stopped coming.
        </p>
      </Step>

      <Step n={5} title="Close the GO day, and read the numbers">
        <p>
          After the day a leader marks it completed and, if there is one,{' '}
          <strong>Attach the report</strong> as a PDF. <strong>Outreach → Dashboard</strong> shows
          people reached, saved, followed up, GO days held and more, for any period; every number
          opens the list it counts.
        </p>
      </Step>
    </Guide>
  );
}
