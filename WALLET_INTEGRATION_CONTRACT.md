# Wallet Integration Contract — Idempotency Key Pattern

## Purpose
Prevent duplicate in-flight submissions during funding operations by using ref-based guards and idempotency keys.

## Submission Guard (`submissionGuardRef`)
- A ref boolean that prevents rapid repeat activations of the same funding intent
- Set to `true` before the wallet call begins
- Reset to `false` after the wallet call completes (success or failure)
- Cleaned up on component unmount

## Intent Key (`currentIntentKeyRef`)
- Generated as `` `${invoiceId}_${amount}` ``
- Tracks which funding attempt is currently active
- A different intent key (different amount or different invoice) resets the guard

## Idempotency Key (`idempotencyKeyRef`)
- Generated via `crypto.randomUUID()` per unique funding intent
- Reused on retries of the same intent (same invoice + amount)
- Passed as the third argument to `performFund(invoiceId, amount, idempotencyKey)`
- The wallet integration layer should use this key to deduplicate transactions at the network level

## Flow
1. User initiates funding → guard checks `submissionGuardRef`
2. If same intent already in-flight → blocked before any wallet API call
3. If new intent → guard passes, intent key set, idempotency key generated/reused
4. `performFund` called with `(invoiceId, amount, idempotencyKey)`
5. On completion → guard resets, ready for next funding
6. On unmount → all refs reset
