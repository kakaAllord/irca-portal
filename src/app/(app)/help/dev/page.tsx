import type { Metadata } from 'next';
import { Guide, Step } from '../Guide';

export const metadata: Metadata = { title: 'The dev console' };

export default function DevGuidePage() {
  return (
    <Guide
      href="/help/dev"
      title="The dev console"
      intro="For whoever runs the system: finding out what went wrong, and seeing what someone sees."
    >
      <Step n={1} title="Someone sends you an error reference">
        <p>
          <strong>Dev → Errors</strong>: paste the reference from their error page, or the whole
          message they sent. You see who, where, the error and its stack, the API failure
          underneath, the server&apos;s lines for that request, and the likely cause. Errors are
          kept 90 days.
        </p>
      </Step>

      <Step n={2} title="Read the logs">
        <p>
          <strong>Dev → Logs</strong> is a terminal. Type <strong>help</strong> for the commands:{' '}
          <code>tail</code>, <code>follow</code>, <code>grep</code>, <code>req</code> for one
          request, <code>user</code> for one person, <code>actions --since=1h</code>, and{' '}
          <code>ref</code> for an error reference.
        </p>
      </Step>

      <Step n={3} title="Health and alerts">
        <p>
          <strong>Dev → Health</strong> says at the top, in red, when the database is behind the
          code, and shows the database, jobs, queues and credit. <strong>Dev → Settings</strong>{' '}
          says who is told when something breaks, and sends a test alert.
        </p>
      </Step>

      <Step n={4} title="See what someone sees">
        <p>
          <strong>Dev → Access</strong> lists every account with what it holds, and an arrow to view
          as any of them, pastors included. It is read-only, and <strong>Dev → View-as log</strong>{' '}
          records every time. <strong>Back to my view</strong> returns you to where you started.
        </p>
      </Step>
    </Guide>
  );
}
