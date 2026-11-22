# Security Specification — CaixaStock

## 1. Data Invariants
1. **User Isolation**: Every merchant subcollection (`/users/{userId}/config`, `products`, `sales`, `expenses`, `reports`) is strictly owned by `userId` (`request.auth.uid == userId`) and requires the parent `/users/{userId}` document to exist.
2. **Creator Authority**: Only the verified email `paizadigital3@gmail.com` (`request.auth.token.email == 'paizadigital3@gmail.com' && request.auth.token.email_verified == true`) is recognized as `isCreator()`. Non-creators can never assign themselves `role: 'creator'` or `subscriptionStatus: 'active'` without atomically redeeming an `'active'` activation code.
3. **Atomic Code Redemption**: Redeeming an activation code updates `/activationCodes/{codeId}` (`active` -> `used`) and `/users/{userId}` (`subscriptionStatus` -> `active`) in the same atomic batch verified via `get()` and `getAfter()`.
4. **No Query Scraping**: `allow list` on `/users` and `/activationCodes` is restricted strictly to `isCreator()`. `allow list` on `/paymentProofs` enforces `isCreator() || resource.data.uid == request.auth.uid`.
5. **Payment Proof Integrity**: Every submitted proof must match `request.auth.uid`, `entity == 'Caixastok'`, `recipientEmail == 'paizadigital3@gmail.com'`, `status == 'pending'`, and `phone.size() >= 9`. Only the creator can approve or reject proofs.

## 2. Dirty Dozen Attack Vectors (Expected: PERMISSION_DENIED)
1. Unauthenticated read/write to any collection.
2. Non-verified email (`email_verified == false`) attempting writes or creator spoofing.
3. Merchant creating `/users/{uid}` with `role: 'creator'` or `subscriptionStatus: 'active'`.
4. Merchant self-updating `subscriptionEndsAt` or `subscriptionStatus` without an atomic activation code batch.
5. Merchant listing `/users` or `/activationCodes` to scrape emails/codes.
6. Merchant creating a product or sale under another user's `/users/{otherUid}/products`.
7. Shadow field injection (`isAdmin: true`, `ghostField: 1`) on create/update of any entity.
8. Oversized ID path injection (`id.size() > 128` or special chars) on single-doc operations.
9. Client-forged `createdAt` / `updatedAt` timestamp != `request.time`.
10. Redeeming an already `'used'` or `'revoked'` activation code.
11. Merchant approving their own `/paymentProofs/{proofId}` (`status: 'approved'`).
12. Deleting or mutating an immutable `uid` / `createdAt` field during update.
