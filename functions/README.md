# ZYRAXON AI — Firebase Cloud Functions

Auto-scheduled push notifications at 10:00 AM and 8:00 PM (Asia/Dhaka).

## Setup

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Install dependencies: `cd functions && npm install`
4. Deploy: `firebase deploy`

## Functions

| Function | Trigger | Schedule |
|----------|---------|----------|
| `scheduledMorning` | Cron | 10:00 AM daily |
| `scheduledEvening` | Cron | 8:00 PM daily |
| `sendNotification` | HTTP | POST /sendNotification |
| `saveSchedule` | HTTP | POST /saveSchedule |

## Firestore Collections

- `notification_tokens/{token}` — Subscriber FCM tokens
- `settings/schedule` — Custom morning/evening messages
- `notification_logs/{id}` — Notification send history

## HTTP API

### Send Notification
```
POST https://us-central1-lx-pdf-library.cloudfunctions.net/sendNotification
Content-Type: application/json

{
  "title": "ZYRAXON AI Update",
  "body": "New release available!",
  "url": "https://sayidilxs-web.github.io/zyraxonai/"
}
```

### Save Schedule
```
POST https://us-central1-lx-pdf-library.cloudfunctions.net/saveSchedule
Content-Type: application/json

{
  "morningMessage": "Good morning! Check out the latest ZYRAXON AI updates.",
  "eveningMessage": "Evening update: New releases are live!"
}
```
