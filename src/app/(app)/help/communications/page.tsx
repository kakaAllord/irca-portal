import type { Metadata } from 'next';
import { Guide, Step } from '../Guide';

export const metadata: Metadata = { title: 'Communications' };

export default function CommunicationsGuidePage() {
  return (
    <Guide
      href="/help/communications"
      title="Communications"
      intro="For everyone in Communications, who send the church's texts, and for the department leaders who send their own."
    >
      <Step n={1} title="Send a message">
        <p>
          <strong>Comms → Compose</strong>: choose who it is for (the whole church, confirmed
          members, a department, its leaders…) and an approved template, then fill in its blanks.
          Before anything goes, the page shows how many people, who is left alone and why, the words
          in each language, and the cost. Press send once more to confirm.
        </p>
        <p>
          Everyone is written to in their own language, and every message says how to stop. A reply
          of STOP (or ACHA, SIMAMA, TOKA) blocks that number for good.
        </p>
      </Step>

      <Step n={2} title="Templates, and who approves them">
        <p>
          <strong>Comms → Templates → + New template</strong>: the words in Swahili, English and
          French, with blanks such as {'{{first_name}}'}, then <strong>Ask for approval</strong>.
          Your own templates go to an administrator. A department&apos;s templates come to you
          first: pass them, or send them back with a note, and they then go to an administrator.
          Once approved, words are used without asking again.
        </p>
      </Step>

      <Step n={3} title="An emergency message">
        <p>
          When no template covers what must be said, write your own words in Compose. They wait for
          an administrator, who is told at once, and go the moment one lets them. If they stop it,
          you are told why.
        </p>
      </Step>

      <Step n={4} title="Recurring messages">
        <p>
          <strong>+ New recurring message</strong>: which days, what time, and one or more approved
          templates. Each time it picks one of them, and never sends in quiet hours. A recurring
          message that can no longer send (a leader stepped down, a template retired) stops and says
          why.
        </p>
      </Step>

      <Step n={5} title="What it costs, and what happened">
        <p>
          <strong>Comms → Overview</strong> shows this month by department: messages, people,
          delivered, failed, and the cost, with the credit left and the replies people sent.{' '}
          <strong>History</strong> shows every message and what happened to each person.{' '}
          <strong>Settings</strong> holds the daily limit, quiet hours and when to warn about
          credit.
        </p>
      </Step>

      <Step n={6} title="For department leaders">
        <p>
          <strong>My departments → your department → Messages</strong> sends to your department with
          its approved templates, and <strong>Templates</strong> is where you write new ones. They
          pass Communications and then an administrator before you can use them.
        </p>
      </Step>
    </Guide>
  );
}
