# PayLink - Requirements Pack

## 1. Problem Summary
PayLink is a bill-payment and digital wallet platform in Egypt. Customers
(directly through a mobile app, or through agents at PayLink terminals) pay
utility bills such as electricity, water, mobile top-up, and internet from a
wallet balance, instead of queuing at billers' offices.

PayLink holds customers' money, so correctness is critical. A customer must
never be charged twice, never be charged for a payment the biller did not
receive, and a wallet balance must never become negative. Each biller also uses
a different protocol (REST/JSON, SOAP/XML, asynchronous callbacks, daily batch
files) and can be slow, fail, or answer late, so the system must handle
uncertain outcomes safely.

The backend must: manage wallets using a ledger and held balances; let
customers inquire about and pay bills; apply service fees, limits, and fraud
rules; integrate with multiple billers through replaceable adapters; return
money only when it is certain the biller did not receive the payment; notify
customers; and reconcile PayLink's records with billers' daily settlement files.
The design must also stay easy to extend with new billers and ready for peak
load.

## 2. Stakeholders


| Stakeholder | Role |
|---|---|
| Customer | Registers, tops up the wallet, inquires about and pays bills, and views balance and history |
| Agent | Pays bills on behalf of customers at a PayLink terminal and earns 40% of the service fee as commission |
| Administrator | Manages billers and services, edits fee and limit configuration, and views daily totals |
| Support Employee | Searches payments by reference, reviews payment history, blocks/unblocks accounts, and approves refunds |
| Biller (ElectroCo, AquaCo, TopUpNet, NetCo) | Issues bills, receives payments, and sends settlement files |
| Finance Team | Reviews reconciliation reports, fees earned, and commissions paid |
| Management | Tracks daily totals and failures per biller |
| Regulator | Oversees how customer money is held and handled; requires audit trails |
| Notification Providers (SMS, email, push) | External services used to send messages to customers |

## 3. User Stories

### 3.1 Accounts

**US-01: Register an account** — Priority: Must — FR-1
As a customer, I want to register, so that I can own a wallet and pay bills.
- Given a new phone number, When the customer registers, Then an account is created with verification level "basic" and an empty wallet.
- Given a phone number already registered, When someone registers with it, Then the request is rejected with a clear "already registered" reason.
- Given a successful registration, When the account is created, Then the daily limit applied is the basic limit (5,000 EGP).

**US-02: Upgrade to verified** — Priority: Should — FR-2
As a customer, I want to be upgraded to verified, so that I can pay with higher limits.
- Given a basic account, When it is upgraded to verified, Then its daily limit becomes 30,000 EGP.
- Given a basic account that was upgraded to verified, When it submits a payment that brings today's total above 5,000 EGP but below 30,000 EGP, Then the payment passes the daily limit check.
- Given an upgrade, When it completes, Then an audit record is written.

**US-03: Block and unblock an account** — Priority: Should — FR-21
As a support employee, I want to block and unblock an account, so that I can stop suspected misuse.
- Given an active account, When support blocks it, Then any new payment from it is Rejected with reason "account blocked".
- Given a blocked account, When support unblocks it, Then new payments are accepted again.
- Given a block or unblock, When it happens, Then an audit record stores who, when, and why.

### 3.2 Wallet and Ledger

**US-04: View balance and history** — Priority: Must — FR-3
As a customer, I want to see my available balance, held balance, and transaction history, so that I know where my money is.
- Given a payment in FundsHeld, When the customer views the wallet, Then the amount appears in held balance and not in available balance.
- Given several transactions, When the customer views history, Then entries are listed newest first with type, amount, and date.
- Given a customer, When viewing the wallet, Then only their own data is returned.

**US-05: Top up the wallet** — Priority: Must — FR-4
As a customer, I want to top up my wallet by simulated card or agent cash, so that I have funds to pay bills.
- Given a valid top-up of 500 EGP by card, When it succeeds, Then available balance increases by 500 EGP.
- Given a top-up at an agent terminal, When the agent confirms cash, Then the customer's available balance increases by the cash amount.
- Given a failed card top-up, When it fails, Then the balance is unchanged and the customer sees the reason.

**US-06: Ledger-based balances** — Priority: Must — FR-5
As a finance team member, I want every balance change recorded as a ledger entry, so that balances are always provable.
- Given any money movement (top-up, hold, charge, release, refund, fee, commission), When it happens, Then a ledger entry is created.
- Given a wallet, When its balance is read, Then it equals the sum of its ledger entries.
- Given the system, When any code path changes a balance, Then it does so only by adding ledger entries and never by overwriting a balance.

### 3.3 Biller Catalog and Administration

**US-07: Manage billers and services** — Priority: Must — FR-6
As an administrator, I want to add, edit, and disable billers and services, so that the catalog stays current.
- Given valid biller data, When the admin adds a biller, Then it appears in the catalog.
- Given a biller, When the admin disables it, Then customers can no longer start new payments to it.
- Given any change, When it is saved, Then an audit record is written.

**US-08: Browse billers and required fields** — Priority: Must — FR-7
As a customer, I want to see the billers and the input each needs, so that I enter the correct data.
- Given active billers, When the customer opens the catalog, Then only active billers are listed.
- Given ElectroCo, When the customer selects it, Then the required field "meter number" is shown.
- Given TopUpNet, When the customer selects it, Then the required field "phone number" and the min and max amount are shown.

**US-09: Edit fees and limits without redeploying** — Priority: Should — FR-24
As an administrator, I want to change fee and limit values at runtime, so that business changes need no release.
- Given a new daily limit saved by the admin, When the next payment is checked, Then the new value is used without a redeploy.
- Given a new fee value, When the next inquiry is made, Then the new fee is used.
- Given any change, When saved, Then an audit record stores old value, new value, who, and when.

### 3.4 Bill Inquiry and Fees

**US-10: Bill inquiry with fee and total** — Priority: Must — FR-8
As a customer, I want to see the bill amount, fee, and total before paying, so that there are no surprises.
- Given a valid meter number, When the customer runs an inquiry, Then the response shows amount 350.00, fee 2.50, and total 352.50 EGP.
- Given an unknown meter number, When the inquiry is made, Then the customer sees a clear "bill not found" reason.
- Given the biller is unavailable, When the inquiry is made, Then the customer is told the service is temporarily unavailable and no money moves.

**US-11: Fixed fee for electricity and water** — Priority: Must — FR-16
As the business, I want a fixed 2.50 EGP fee for electricity and water, so that revenue is predictable.
- Given an electricity bill of any amount, When the fee is calculated, Then it is 2.50 EGP.
- Given a water bill of any amount, When the fee is calculated, Then it is 2.50 EGP.
- Given the fee value, When it is read, Then it comes from configuration and not from code.

**US-12: Percentage fee for mobile top-up** — Priority: Must — FR-16
As the business, I want a 1.5% fee with a 1 EGP minimum on top-ups, so that small payments still earn revenue.
- Given a top-up of 200.00 EGP, When the fee is calculated, Then it is 3.00 EGP.
- Given a top-up of 20.00 EGP, When the fee is calculated, Then it is 1.00 EGP (minimum).
- Given a fee with more than 2 decimal places, When it is calculated, Then it is rounded using exact decimal arithmetic.

**US-13: Tiered fee for internet** — Priority: Must — FR-16
As the business, I want a tiered internet fee, so that larger bills pay a larger fee.
- Given an internet bill of 200.00 EGP, When the fee is calculated, Then it is 2 EGP.
- Given an internet bill of 200.01 EGP, When the fee is calculated, Then it is 4 EGP.
- Given the tier values, When they are read, Then they come from configuration.

**US-14: Promotion period** — Priority: Must — FR-16
As the business, I want the fee to be 0 for one chosen biller during a promotion period, so that I can run campaigns.
- Given a promotion configured for AquaCo from date A to date B, When a water payment is made inside the period, Then the fee is 0.
- Given the same promotion, When a payment is made outside the period or to another biller, Then the normal fee applies.
- Given the promotion dates, When they are changed in configuration, Then the new dates apply without redeploying.

### 3.5 Payment Processing

**US-15: Pay a bill from the wallet** — Priority: Must — FR-9, FR-12
As a customer, I want to pay a bill from my wallet, so that I do not have to queue.
- Given a valid inquiry and sufficient available balance, When the customer confirms payment, Then the total (amount + fee) moves from available to held and the payment is FundsHeld before the biller is called.
- Given the biller confirms, When the payment completes, Then the held money becomes a final charge and the fee is credited to PayLink income.
- Given insufficient available balance, When the customer pays, Then the payment is Rejected with reason "insufficient funds" and no biller is called.

**US-16: Idempotent payment requests** — Priority: Must — FR-10 (hard case 1)
As a customer, I want a repeated request not to charge me twice, so that a slow network cannot cost me money.
- Given a payment request with idempotency key K, When the same key K is sent again, Then the original result is returned.
- Given the duplicate request, When it is processed, Then exactly one charge and one biller call exist.
- Given the same key sent twice at the same moment, When both are processed, Then still only one payment is created.

**US-17: Enforce the payment life cycle** — Priority: Must — FR-11
As a support employee, I want payments to follow only the allowed states, so that records can be trusted.
- Given a payment in Initiated, When all checks pass and funds are sufficient, Then it moves to FundsHeld.
- Given a payment in Initiated, When a check fails or funds are insufficient, Then it moves to Rejected.
- Given any payment, When a transition not in the life cycle is attempted (for example Initiated to Completed), Then it is refused and logged.
- Given a payment in Completed, Rejected, or Refunded, When any change is attempted, Then it is refused because these states are final.

**US-18: Concurrent payments on one wallet** — Priority: Must — hard case 4
As a customer, I want my balance never to go negative, so that simultaneous payments are safe.
- Given available balance 400 EGP and two simultaneous payments of 352.50 EGP each, When both are processed, Then one reaches FundsHeld and the other is Rejected.
- Given any number of simultaneous payments, When all are processed, Then available balance is never below 0.
- Given the same scenario, When it is run in the concurrency test, Then the result is the same on every run.

**US-19: Single-payment and daily limits** — Priority: Must — FR-18
As the business, I want payments above the limits rejected with a clear reason, so that risk is controlled.
- Given a payment below the configured minimum or above the configured maximum, When it is submitted, Then it is Rejected with a reason that shows the configured range (currently 5 to 10,000 EGP).
- Given a basic account that already paid 4,800 EGP today, When it submits a payment of 300 EGP, Then it is Rejected with reason "daily limit exceeded".
- Given a verified account, When the same payment is submitted, Then the 30,000 EGP daily limit applies.

**US-20: Velocity rule** — Priority: Should — FR-19
As the business, I want rapid repeated payments blocked, so that fraud is limited.
- Given an account with 5 payments in the last 60 seconds, When a sixth is submitted, Then it is Rejected and the account is blocked for 10 minutes.
- Given a velocity block, When the 10 minutes pass, Then the account can pay again.
- Given a velocity block, When it starts, Then an audit record is written.

### 3.6 Biller Integration

**US-21: Timeout becomes Unknown** — Priority: Must — FR-13 (hard case 2)
As a customer, I want a slow biller not to cause a wrong charge or refund, so that my money is safe.
- Given ElectroCo answers after 12 seconds, When the 10-second timeout passes, Then the payment becomes Unknown.
- Given an Unknown payment, When the customer checks it, Then they see "being processed" and the money stays in held balance.
- Given an Unknown payment, When the system evaluates it, Then it is never refunded automatically.

**US-22: Re-query Unknown payments** — Priority: Must — FR-13
As the business, I want Unknown payments re-queried, so that they are resolved quickly.
- Given a payment that became Unknown at time T, When 1, 5, and 15 minutes pass since T, Then the biller is re-queried at each of these 3 points.
- Given a re-query where the biller confirms, When the answer arrives, Then the payment becomes Completed.
- Given 3 re-queries without an answer, When the last one ends, Then the payment waits for reconciliation and stays Unknown.

**US-23: Biller refusal** — Priority: Must — hard case 3
As a customer, I want a clear message when a biller refuses, so that I know why and get my money back.
- Given AquaCo refuses with an error code, When the answer arrives, Then the payment becomes Failed.
- Given a Failed payment, When it is processed, Then the hold is released to available balance and the payment becomes Refunded.
- Given the refusal, When the customer is notified, Then the SMS contains a clear reason mapped from the error code.

**US-24: Asynchronous TopUpNet callbacks** — Priority: Must — FR-14 (hard case 6)
As the business, I want TopUpNet callbacks handled safely, so that a top-up completes exactly once.
- Given an "accepted" reply, When the payment is not final yet, Then it stays SentToBiller until the callback arrives.
- Given a "success" callback, When it arrives, Then the payment becomes Completed.
- Given a second "success" callback for the same payment, When it arrives, Then it is ignored and logged, and nothing is charged again.

- Given an "accepted" reply and no callback within the configured callback wait time, When that time passes, Then the payment becomes Unknown and follows the Unknown rules (re-query, then reconciliation).

**US-25: Add a biller with different formats** — Priority: Must — FR-15 (hard case 8)
As a developer, I want each biller behind its own adapter, so that new billers are easy to add.
- Given ElectroCo (REST/JSON), AquaCo (SOAP/XML), and TopUpNet (async REST), When payments are made to each, Then all three work through the same payment flow.
- Given a new biller, When it is added, Then only a new adapter and configuration are added.
- Given the new biller is added, When the existing modules are compared, Then their files are unchanged.

**US-26: Biller outage isolation** — Priority: Must — NFR resilience
As a customer, I want payments to other billers to keep working when one biller is down, so that one failure does not stop the service.
- Given ElectroCo is down, When a customer pays AquaCo, Then the payment completes normally.
- Given ElectroCo is down, When a customer pays ElectroCo, Then the payment follows the timeout or Failed rules.
- Given the outage, When it is tested, Then no payment to other billers is delayed by it.

### 3.7 Refunds and Failed Payments

**US-27: Refund a failed payment** — Priority: Must — FR-12
As a customer, I want my money back when a payment definitely failed, so that I am not charged for nothing.
- Given a payment in Failed, When the hold is released, Then the held amount returns to available balance and the payment becomes Refunded.
- Given an Unknown payment, When reconciliation finds no payment at the biller, Then it becomes Failed and then Refunded.
- Given a refund, When it happens, Then a ledger entry and an audit record are created.

**US-28: Refund a completed payment** — Priority: Could — FR-27
As a customer, I want to request a refund of a completed payment, so that mistakes can be fixed.
- Given a Completed payment, When the customer requests a refund, Then the request is created as pending for support.
- Given a pending request, When support approves it, Then the money is returned to the wallet with ledger and audit entries.
- Given a pending request, When support rejects it, Then the customer is notified and no money moves.
- Given an approved refund request, When the refund is processed, Then the original payment stays Completed and a separate refund record with reversing ledger entries is created.

### 3.8 Agents

**US-29: Agent pays for a customer** — Priority: Should — FR-17
As an agent, I want to pay a bill for a customer and earn commission, so that my shop earns money.
- Given a completed payment made at an agent terminal with a 2.50 EGP fee, When it completes, Then 1.00 EGP (40%) is credited to the agent's wallet.
- Given an agent payment that Fails, When it is refunded, Then no commission is credited.
- Given a promotion with fee 0, When an agent payment completes, Then the commission is 0.

### 3.9 Notifications

**US-30: Payment notifications** — Priority: Must — FR-22
As a customer, I want an SMS and a push notification, so that I know the result.
- Given a payment that completes, When it completes, Then an SMS and a push message are sent using the completion template.
- Given a payment that fails, When it fails, Then an SMS and a push message with the failure reason are sent.
- Given a notification failure, When the payment is already Completed, Then the payment state is not changed.

**US-31: Notification retry** — Priority: Should — FR-23 (hard case 5)
As the business, I want failed messages retried, so that customers are informed even during provider outages.
- Given the SMS provider is down, When a payment completes, Then the payment still completes.
- Given a failed SMS, When the system retries, Then it makes 3 retries after the first failed attempt (4 attempts in total).
- Given 3 failed retries, When the last fails, Then the message is marked "undelivered".

### 3.10 Support, Audit and Reporting

**US-32: Search a payment by reference** — Priority: Must — FR-20
As a support employee, I want to find a payment by its reference and see its history, so that I can solve customer issues.
- Given a valid reference, When support searches, Then the payment is shown with all state changes in order.
- Given a payment, When support opens it, Then its ledger entries and notifications are visible.
- Given an unknown reference, When support searches, Then "not found" is shown.

**US-33: Audit log** — Priority: Must — FR-25
As a regulator, I want every money movement and admin action logged, so that I can audit PayLink.
- Given any money movement, When it happens, Then an audit record with who, when, and why exists.
- Given any admin action (biller change, config change, block), When it happens, Then an audit record exists.
- Given an audit record, When anyone tries to edit or delete it, Then the system refuses.

**US-34: Daily reconciliation report** — Priority: Should — FR-26 (hard case 7)
As a finance team member, I want a nightly comparison with billers' settlement files, so that differences are found.
- Given a settlement file, When reconciliation runs, Then every payment in it is compared with PayLink records.
- Given a payment listed in the file but Failed in PayLink, When the report is produced, Then it is flagged for support review.
- Given an Unknown payment confirmed by the file, When reconciliation runs, Then it becomes Completed.

- Given a payment that is Completed in PayLink but missing from the settlement file, When the report is produced, Then it is flagged for support review.

**US-35: Daily totals** — Priority: Could — FR-28
As an administrator, I want daily totals, so that I can follow business performance.
- Given a day of payments, When the admin opens the report, Then it shows total payments, fees earned, and commissions paid.
- Given payments to several billers, When the report is shown, Then failures are listed per biller.
- Given a day without payments, When the report is shown, Then all totals are 0.



## 4. Non-Functional Requirements
| ID | Quality | Requirement | Measurement |
|---|---|---|---|
| NFR-01 | Performance | The system shall sustain 100 payments per second for 1 minute against the mock billers. | Load test; report throughput and error rate. |
| NFR-02 | Correctness | The system shall produce zero double charges and zero negative balances in the concurrency and duplicate-request tests. | Automated tests for hard cases 1 and 4; result must be 0 violations. |
| NFR-03 | Resilience | An outage of one biller shall not stop payments to other billers. | Fault-injection test: ElectroCo down, AquaCo and TopUpNet payments still complete. |
| NFR-04 | Modifiability | Adding a new biller shall change only the Biller Integration module and configuration. | Code diff review of the commit that adds a biller (hard case 8). |
| NFR-05 | Auditability | 100% of money movements shall have an audit record containing who, when, and why. | Test that compares ledger entries with audit records; counts must match. |
| NFR-06 | Testability | Domain logic shall have at least 70% line coverage, measured in CI. | Coverage report produced by the pipeline on every push. |
| NFR-07 | Accuracy | All monetary values shall use exact decimal types, never floating point. | Code and schema inspection; rounding unit tests. |
| NFR-08 | Configurability | Business rules (limits, fees, timeouts, retries, promotion dates, commission rate) shall be stored in configuration, not in code. | Code inspection; test that changing a value changes behavior without redeploying. |
| NFR-09 | Reliability | A failed notification shall be retried 3 times and then marked undelivered, without affecting the payment state. | Notification retry test (hard case 5). |
| NFR-10 | Time handling | A payment that receives no biller answer within 10 seconds shall become Unknown, never Failed or Refunded automatically. | Timeout test with a mock biller that answers after 12 seconds (hard case 2). |

## 5. Priorities Summary
| Priority | Meaning | Count |
|---|---|---|
| Must | Required for the system to be accepted | 26  |
| Should | Important, may be postponed only with a documented reason | 7 |
| Could | Added value if time allows | 2 |

### Must
US-01, US-04, US-05, US-06, US-07, US-08, US-10, US-11, US-12, US-13, US-14, US-15, US-16, US-17, US-18, US-19, US-21, US-22, US-23, US-24, US-25, US-26, US-27, US-30, US-32, US-33

### Should
US-02, US-03, US-09, US-20, US-29, US-31, US-34

### Could
US-28, US-35

## 6. Questions, Ambiguities & Decisions
Status: "Proposed" = awaiting team confirmation. Change to "Agreed" after the team meeting.

| # | Question / Ambiguity | Decision | Status | Affects |
|---|---|---|---|---|
| Q-01 | When a promotion makes the service fee 0, is the agent commission (40% of the fee) also 0? | Yes. Commission is always 40% of the fee actually charged, so it is 0 during a promotion. | Proposed | US-14, US-29 |
| Q-02 | Is the service fee calculated on the bill amount, and is the daily limit applied to the bill amount or to the total (amount + fee)? | The fee is calculated on the bill amount. Min/max single payment and the daily limit are checked against the bill amount only. | Proposed | US-10, US-19 |
| Q-03 | Which time zone defines "per day" for the daily limit? | Africa/Cairo, the day resets at 00:00 Cairo time. | Proposed | US-19 |
| Q-04 | Do wallet top-ups count toward the daily payment limit? | No. The limit applies to bill payments only. | Proposed | US-05, US-19 |
| Q-05 | Which payments count toward the daily limit: only Completed, or also FundsHeld, SentToBiller and Unknown? | Completed plus all in-flight payments (FundsHeld, SentToBiller, Unknown). Rejected, Failed and Refunded do not count. | Proposed | US-19, US-18 |
| Q-06 | What happens if the biller does not respond? | After 10 seconds the payment becomes Unknown. Money stays held. | Agreed by brief | US-21 |
| Q-07 | When is a payment refunded? | Only from Failed, which is reached only when the biller refused or reconciliation proved no payment exists. Unknown is never refunded automatically. | Agreed by brief | US-21, US-23, US-27 |
| Q-08 | Is the move Failed -> Refunded automatic and immediate, or does it need a manual step? | Automatic: releasing the hold right after Failed moves the payment to Refunded. | Proposed | US-23, US-27 |
| Q-09 | Who resolves an Unknown payment after 3 failed re-queries? | The system waits for the settlement file (reconciliation). If the file shows a payment it becomes Completed, and if it shows none it becomes Failed and then Refunded. Support is only notified of differences. | Proposed | US-22, US-34 |
| Q-10 | Can the same payment request be submitted twice? | Yes, but a repeated idempotency key returns the original result and creates no second charge. | Agreed by brief | US-16 |
| Q-11 | What if the same idempotency key is reused with a different amount or biller? | The request is rejected with a "key reuse with different data" error. | Proposed | US-16 |
| Q-12 | Does the velocity rule block on the 5th or 6th payment in 60 seconds? | The brief says "more than 5", so the 6th payment is rejected and the account is blocked for 10 minutes. | Proposed | US-20 |
| Q-13 | Do Rejected attempts count toward the velocity rule? | Yes, every submitted payment attempt counts, otherwise the rule can be bypassed. | Proposed | US-20 |
| Q-14 | Is the minimum of 5 EGP applied to bills smaller than 5 EGP? | Such a bill cannot be paid and is rejected with the amount-range reason. | Proposed | US-19 |
| Q-15 | Can a customer pay less than the bill amount (partial payment)? | No. The customer pays the full bill amount returned by the inquiry. AquaCo also refuses amounts above the bill. | Proposed | US-10, US-15 |
| Q-16 | What does the customer see if the biller is unavailable during the inquiry? | A "service temporarily unavailable" message. No money moves and no payment is created. | Proposed | US-10 |
| Q-17 | In an agent payment, which wallet is charged? | The customer's wallet is charged. The agent only earns the commission, credited when the payment completes. | Proposed | US-29 |
| Q-18 | Is commission paid if the payment later fails or is refunded? | No. Commission is credited only when the payment reaches Completed. | Agreed by brief | US-29 |
| Q-19 | Is NetCo (daily batch CSV) implemented? | Optional per the brief. Decide: not in the first release, the design keeps it possible. | Proposed | US-25 |
| Q-20 | Which notification channels, and which events? | SMS and push on completion and failure. Email is supported by the module but not required. | Proposed | US-30 |
| Q-21 | Does an Unknown payment trigger a notification? | Yes, one message saying the payment is being processed, then a final message when it is resolved. | Proposed | US-21, US-30 |
| Q-22 | What are the roles and how is login done? | Customer, Agent, Support, Admin. Simple token-based login is enough. The brief says marks are for the backend, not the UI. | Proposed | US-01 |
| Q-23 | Can audit records be edited or deleted? | No. The audit log is append-only. | Proposed | US-33 |
| Q-24 | Is a refund of a completed payment (FR-27) also returned from the biller? | Out of scope for the first release (Could). If implemented, only the wallet side is modeled. | Proposed | US-28 |
| Q-25 | Does "retried 3 times" for notifications include the first attempt? | No. The first attempt plus 3 retries (4 attempts in total), then "undelivered". | Proposed | US-31 |
| Q-26 | Are the re-query times (1, 5, 15 min) counted from the moment the payment becomes Unknown? | Yes. Counted from the moment of Unknown: 3 re-queries at minutes 1, 5, and 15. | Proposed | US-22 |
| Q-27 | What if TopUpNet accepts a payment but never sends the callback? | The payment stays SentToBiller for a configurable wait time (the team chooses the value), then becomes Unknown. | Proposed | US-24 |
| Q-28 | What does PayLink do when a Completed payment is missing from the settlement file? | It is flagged in the reconciliation report for support review. The state is not changed automatically. | Proposed | US-34 |
| Q-29 | A basic account has a 5,000 EGP daily limit but the single-payment maximum is 10,000 EGP. Which applies? | The stricter limit applies. A basic account can never pay more than 5,000 EGP in one payment. | Proposed | US-19 |
| Q-30 | The brief mentions refunds after a "cancelled" payment, but the life cycle has no Cancelled state. | No customer cancellation in the first release. The life cycle stays exactly as in section 2.5. | Proposed | US-17, US-27 |
| Q-31 | FR-27 asks to refund a Completed payment, but Completed is a final state. | A completed-payment refund is a separate refund request. The payment stays Completed, and reversing ledger entries are created. The Refunded state is used only for Failed payments. | Proposed | US-28 |
| Q-32 | Fraud Checks and Reconciliation are marked "extra", but FR-19 and FR-26 require their features. | Both are implemented as modules, since their features are required. | Proposed | US-20, US-34 |

## 7. Traceability (FR → User Story)
### 7.1 Functional Requirements

| FR | Requirement | Priority | User Stories |
|---|---|---|---|
| FR-1 | Customer registers with basic level | Must | US-01 |
| FR-2 | Upgrade to verified | Should | US-02 |
| FR-3 | View balance and history | Must | US-04 |
| FR-4 | Top up wallet | Must | US-05 |
| FR-5 | Ledger entry for every balance change | Must | US-06 |
| FR-6 | Admin manages billers and services | Must | US-07 |
| FR-7 | Customer sees billers and required fields | Must | US-08 |
| FR-8 | Bill inquiry with amount, fee, total | Must | US-10 |
| FR-9 | Pay a bill from the wallet | Must | US-15 |
| FR-10 | Idempotency key | Must | US-16 |
| FR-11 | Payment life cycle only | Must | US-17 |
| FR-12 | Hold before biller, release on failure | Must | US-15, US-27 |
| FR-13 | Timeout becomes Unknown, re-query | Must | US-21, US-22 |
| FR-14 | Async callbacks, ignore duplicates | Must | US-24 |
| FR-15 | At least 3 billers, different formats | Must | US-25 |
| FR-16 | Fee rules and promotion | Must | US-11, US-12, US-13, US-14 |
| FR-17 | Agent pays and earns commission | Should | US-29 |
| FR-18 | Reject above limits with reason | Must | US-19 |
| FR-19 | Velocity rule | Should | US-20 |
| FR-20 | Support searches payment by reference | Must | US-32 |
| FR-21 | Support blocks/unblocks account | Should | US-03 |
| FR-22 | SMS and push on completion/failure | Must | US-30 |
| FR-23 | Notification retry, then undelivered | Should | US-31 |
| FR-24 | Admin edits fees/limits without redeploy | Should | US-09 |
| FR-25 | Audit log | Must | US-33 |
| FR-26 | Daily reconciliation report | Should | US-34 |
| FR-27 | Refund of completed payment | Could | US-28 |
| FR-28 | Admin daily totals | Could | US-35 |

### 7.2 Hard Cases (section 2.7)

| # | Hard case | User Stories |
|---|---|---|
| 1 | Duplicate request | US-16 |
| 2 | Biller answers after 12 seconds | US-21 |
| 3 | AquaCo refuses | US-23 |
| 4 | Concurrent payments, one balance | US-18 |
| 5 | SMS provider down | US-31 |
| 6 | TopUpNet duplicate callback | US-24 |
| 7 | Settlement lists a Failed payment | US-34 |
| 8 | New biller added | US-25 |

*US-34 also covers the opposite difference (Completed in PayLink, missing from the settlement file).*


### 7.3 Non-Functional Requirements

| NFR | Quality | Related User Stories |
|---|---|---|
| NFR-01 | Performance | US-15, US-16 |
| NFR-02 | Correctness | US-16, US-18 |
| NFR-03 | Resilience | US-26 |
| NFR-04 | Modifiability | US-25 |
| NFR-05 | Auditability | US-06, US-33 |
| NFR-06 | Testability | all stories (tests in CI) |
| NFR-07 | Accuracy | US-06, US-12 |
| NFR-08 | Configurability | US-09, US-11, US-13, US-14 |
| NFR-09 | Reliability | US-31 |
| NFR-10 | Time handling | US-21 |

