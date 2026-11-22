# Security Specification — DraftMax Firestore

## 1. Data Invariants
1. **User Isolation**: Every profile, category, and task document under `/users/{userId}/...` belongs strictly to `userId` (`ownerId == request.auth.uid == userId`).
2. **Verified Identity**: Only authenticated users with `email_verified == true` may read or write cloud documents.
3. **Immutable Ownership & Creation Metadata**: `id`, `ownerId`, `createdAt`, and `clientCreatedAt` cannot be modified after document creation.
4. **Server Timestamp Integrity**: `createdAt` and `updatedAt` must strictly equal `request.time`.
5. **Bounded Payloads**: All string fields enforce explicit `.size()` bounds, and `steps` is bounded to at most `100` items with validated first-element shape.

## 2. Adversarial Test Matrix ("Dirty Dozen" Payloads)
1. **Cross-User Read**: User B attempts `get` on `/users/userA/tasks/t1` -> `PERMISSION_DENIED`.
2. **Cross-User List**: User B attempts `list` on `/users/userA/tasks` -> `PERMISSION_DENIED`.
3. **Unverified Email Write**: User with `email_verified: false` attempts `create` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection (Create)**: Payload includes `isAdmin: true` -> rejected by `keys().hasOnly(...)`.
5. **Shadow Field Injection (Update)**: Update includes `extraField: "x"` -> rejected by `affectedKeys().hasOnly(...)` and `isValidTask`.
6. **Owner Spoofing**: User A tries creating `/users/userA/tasks/t1` with `ownerId: "userB"` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: Document ID contains `/` or >128 chars -> rejected by `isValidId`.
8. **Client Timestamp Forgery**: `createdAt` or `updatedAt` set to past/future client timestamp instead of `request.time` -> `PERMISSION_DENIED`.
9. **Immutable Field Tampering**: Update attempts to alter `createdAt` or `clientCreatedAt` -> `PERMISSION_DENIED`.
10. **Oversized String DoS**: `title` > 300 chars or `description` > 2000 chars -> `PERMISSION_DENIED`.
11. **Unbounded Steps Array**: `steps` contains > 100 entries -> `PERMISSION_DENIED`.
12. **PII Leak Attempt**: Signed-in User B tries `get` or `list` on `/users/userA/private/profile` -> `PERMISSION_DENIED`.
