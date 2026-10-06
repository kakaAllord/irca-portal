import type { Metadata } from 'next';
import { Guide, Step } from '../Guide';

export const metadata: Metadata = { title: 'Finance in five minutes' };

export default function FinanceGuidePage() {
  return (
    <Guide
      href="/help/finance"
      title="Finance in five minutes"
      intro="For everyone in Finance: the things you do most."
    >
      <Step n={1} title="Record an expense">
        <p>
          <strong>Finance → Transactions → + Record expense.</strong> Income is the same, from{' '}
          <strong>+ Record income</strong>.
        </p>
        <p>
          In <strong>Expense item</strong>, start typing what it was for: &ldquo;fuel&rdquo;,
          &ldquo;electricity&rdquo;. Pick the item from the suggestions, so the same thing is always
          recorded under the same name. If it is genuinely new, choose{' '}
          <strong>＋ Create expense item</strong> at the bottom of the list.
        </p>
        <p>
          Fill in the date, the amount, and the account it was <strong>Paid from</strong> (for
          income, <strong>Received into</strong>): the cash box, M-PESA, the bank. The form
          remembers the last account you used. <strong>Reference</strong> is for the M-Pesa code,
          receipt or cheque number, and is worth filling in: it is how an entry is found again.
        </p>
        <p>
          If the expense was for one department, choose it in <strong>Department</strong>. It counts
          against that department&apos;s budget, and the form tells you if it takes the department
          over; it still saves. Then <strong>Save expense</strong>.
        </p>
      </Step>

      <Step n={2} title="A stack of receipts at once">
        <p>
          After saving, choose <strong>Record another expense</strong>. The date and the account
          stay filled in, and everything else is cleared, so a day&apos;s receipts go in one after
          another without starting over.
        </p>
      </Step>

      <Step n={3} title="Read an entry number">
        <p>
          Every entry gets a number when it is saved, such as{' '}
          <strong>IRCA-EXP-2026-09-000014</strong>: the church, EXP for an expense, INC for income
          or TRF for a transfer, the year and month of the entry&apos;s date, and its place in that
          month. Write it on the paper receipt. Numbers are never reused, and there are no gaps.
        </p>
      </Step>

      <Step n={4} title="Accounts, and what each holds">
        <p>
          <strong>Finance → Accounts</strong> lists how money moves (Cash, Mobile money, Bank) and
          the accounts under each, with what every account holds today. Add an account with{' '}
          <strong>+ Account</strong>: its name, currency, number, and the balance it held on the day
          you start counting it. An account that has been used is turned off, never deleted.
        </p>
        <p>
          A balance in red means the account has paid out more than it had: check that nothing is
          missing, such as a transfer into it. Once an account has entries, its opening balance and
          currency change only by asking an administrator, from its <strong>Change ▾</strong> menu.
        </p>
      </Step>

      <Step n={5} title="Move money between accounts">
        <p>
          Banking the Sunday offering, or drawing M-PESA down to cash, is a transfer, not income or
          an expense. <strong>Finance → Transactions → ⇄ Transfer</strong>: choose where the money
          came from and where it went, the amount, and the bank slip as the reference. Both balances
          move; the income and expense totals do not.
        </p>
      </Step>

      <Step n={6} title="Money in another currency">
        <p>
          Once there is an account in dollars or euros, <strong>Accounts</strong> shows{' '}
          <strong>Exchange rates</strong>. Set today&apos;s rate there. Recording into that account,
          you type the amount in its own currency; the form fills in the rate and shows what it is
          in shillings, and every total counts the shillings. Each entry keeps the rate it was
          recorded with.
        </p>
      </Step>

      <Step n={7} title="Department budgets">
        <p>
          <strong>Finance → Budgets</strong> shows each department&apos;s budget for the month, what
          it has used and what is left. <strong>Set budget</strong> gives one; changing it asks why.
          At the start of a month, <strong>Copy last month</strong> fills the empty ones from the
          month before. Unspent money does not carry over.
        </p>
      </Step>

      <Step n={8} title="Void a mistake">
        <p>
          A saved entry is never edited or deleted directly; that is what makes the books worth
          trusting. Open the entry, choose <strong>Request a change ▾</strong>, then{' '}
          <strong>Void this entry</strong> (or <strong>Correct this entry</strong> for a wrong
          amount or date), and say what was wrong.
        </p>
        <p>
          An administrator approves or rejects it in <strong>Admin → Requests</strong>. Nobody can
          approve their own request. Until then the entry stands, marked as waiting; you can follow
          it under <strong>Finance → Requests</strong>.
        </p>
      </Step>

      <Step n={9} title="Reports, and printing them">
        <p>
          <strong>Finance → Reports</strong> has a report for a <strong>Day</strong> (the collection
          sheet, with lines to sign), a <strong>Week</strong>, a <strong>Month</strong>, a{' '}
          <strong>Year</strong>, any <strong>Custom</strong> range, and the{' '}
          <strong>Position</strong>: what every account holds at the end of any day. Choose one and
          its date, and <strong>Download PDF</strong> for exactly what is on screen, ready to print
          or send.
        </p>
      </Step>

      <Step n={10} title="Record a payment towards a pledge">
        <p>
          When someone brings money they promised, open <strong>Finance → Pledges</strong> and
          choose <strong>+ Record a payment</strong>. Type part of their name or phone number, pick
          their pledge, enter the amount and the account it went into, and if you also recorded it
          as income, choose that entry so the books and the pledge agree. You are told what is left.
        </p>
        <p>
          Who owes what is under <strong>Finance → Pledges</strong>, for everyone in Finance and for
          the pastors; administrators see the totals only. A payment typed wrongly is corrected like
          any entry: open the pledge, choose <strong>Ask to change</strong> beside the payment, and
          an administrator decides.
        </p>
      </Step>
    </Guide>
  );
}
