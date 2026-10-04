# AI invoice intake for NetSuite

An accounts payable tool that turns supplier invoice PDFs into NetSuite-shaped vendor bills. Claude reads the invoice and suggests GL coding, plain code checks everything that has a right answer, and a person approves every bill before it posts.

> **Status:** in progress. Results, screenshots and setup steps will be added as each build step is finished.

## The problem

AP teams key supplier invoices into the ledger by hand: reading each PDF, checking the arithmetic and GST, matching it to a purchase order, choosing the GL account and department, and watching for duplicates. It's slow, repetitive and easy to get wrong at month end. This project automates the reading and the routine checks while keeping a person in control of what gets posted.

## What it does

1. **Extract:** Claude reads the invoice PDF and returns structured fields through a forced tool call with a strict schema. Missing fields come back as blank, never guessed.
2. **Check:** deterministic rules validate line totals, GST (NZ 15%), the grand total, the supplier, duplicates, PO matching and three-way matching, each with a plain-English message.
3. **Code:** GL account and department are suggested from the PO first, then the supplier's usual coding, and only then by Claude, choosing from the chart of accounts.
4. **Review:** an AP officer sees the PDF beside the extracted data, any flags and the suggested coding with its reason, then approves or rejects.
5. **Post:** approved bills are posted through an adapter. Posting is safe to retry, so the same bill is never created twice.

Every step writes to an audit log: who, when, what changed, and the model, prompt version and raw AI output.

## Where AI is used and where it isn't

| Task | Who does it | Why |
| --- | --- | --- |
| Reading invoice PDFs in any layout, including scans | Claude | Messy input that needs judgement |
| Suggesting GL coding when no PO or supplier default applies | Claude, limited to the chart of accounts | A judgement call; low confidence goes to review |
| Line totals, GST and grand total | Plain code | Arithmetic has a right answer |
| Supplier matching and duplicate checks | Plain code | Exact rules on GST number, invoice number and amount |
| PO and three-way matching | Plain code | Quantities and prices against tolerances |
| Approving a bill | A person | Nothing posts without approval |

## What the project aims to show

- **AI only where it helps:** Claude handles document reading and coding suggestions; everything with a right answer is a tested rule.
- **Measured, not assumed:** a Python evaluation script runs the pipeline over 20–25 synthetic invoices and compares them against a hand-checked answer key. It reports field accuracy, line accuracy, coding agreement by source, problems caught, and cost and time per invoice. Targets are set before the first run, and before-and-after results are kept.
- **Bad invoices never post:** the test set deliberately includes invoices that don't add up, duplicates, wrong or missing POs, a credit note, a foreign-currency invoice, a scanned invoice and one missing a GST number.
- **Built to be run and supported:** clear invoice states (received → extracted → checked → needs review or ready → approved, posted, rejected or failed), retries with backoff, a retry button for failed posts, unit tests for every check, and CI on every push.
- **Readable by finance:** the review screen is designed for an AP officer, not a developer.

## NetSuite notes

There's no live NetSuite connection. Bills are shaped like NetSuite vendor bill records (`entity`, `tranId`, `expense` lines with account, department and tax code) and posted through a mock adapter. The mock validates the shape, rejects a repeated `externalId`, and can simulate timeouts and rate limits. In a real NetSuite account, bills raised against a PO are usually created by transforming the purchase order into a vendor bill; the mock simplifies this.

## Stack

Next.js and TypeScript, the Claude API (PDF documents and tool use), Zod, Prisma with SQLite, Vitest, Playwright and GitHub Actions. The evaluation script is in Python.

## Data

All data is synthetic: an invented company with about 8 suppliers, 15 purchase orders, a 12-account chart of accounts and generated invoice PDFs. No real company or client data is used.
