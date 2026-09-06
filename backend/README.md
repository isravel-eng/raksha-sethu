# RakshaSetu backend

Node.js/Express API in front of PostgreSQL. Distress-risk scores come from the existing Python FastAPI ML service. This service does not implement or copy ML logic.

```text
React → Node/Express → PostgreSQL → FastAPI /predict → PostgreSQL → React
```

## Setup

```text
cd backend
copy .env.example .env
```

Set `JWT_SECRET` to a long random value. Keep `ML_SERVICE_URL` pointed at the ML service (default `http://127.0.0.1:8000`).

Install dependencies:

```text
npm install
```

PostgreSQL must be running, then apply schema and the demo seed:

```text
npm run db:setup
```

If this machine does not already have PostgreSQL, start an embedded local server in another terminal, then run setup:

```text
npm run db:local
npm run db:setup
```

Start the ML service from `ml-service` (models must already exist):

```text
uvicorn app.main:app --reload
```

Start the API:

```text
npm start
```

## Demo login

Seeded citizen (password is never returned by the API):

- email: `ananya.reddy@demo.rakshasetu`
- password: `Demo@12345`

The seed creates exactly one citizen, one trial-stage case, chronological check-ins, FIR/chargesheet/trial/postponement/threat events, one HIGH prediction, and one open alert.

## Auth and roles

- `POST /auth/register`
- `POST /auth/login`

Roles: `citizen`, `counsellor`, `district_officer`, `state_officer`, `national_admin`.

JWT is required on all data routes. Citizens can only read/write their own records. Case events, alert updates, and interventions require a staff role.

Passwords are bcrypt-hashed. Responses never include `password_hash`.

## Check-in → ML → prediction → alert

`POST /check-ins` (authenticated):

1. Validates Likert-scale input.
2. Stores the check-in.
3. Builds `checkin_history` using stored check-ins plus case events (`hearing_postponed`, `postponement_days`, `threat_reported`, stage, hearing date).
4. Calls FastAPI `POST /predict`.
5. Stores the returned prediction.
6. If `human_review_required` is true, creates an alert.
7. Returns the check-in, the ML request, the FastAPI prediction, and any alert.

Node never calculates a risk score. ML timeouts and connection errors are returned without inventing a prediction.

## Case events

`POST /case-events` accepts exactly:

`FIR`, `CHARGESHEET`, `TRIAL_DATE`, `HEARING_POSTPONED`, `RELIEF`, `THREAT_REPORTED`

`HEARING_POSTPONED` must include `postponement_days` and/or `new_hearing_date` in `details_json`. `THREAT_REPORTED` is treated as sticky context for later ML requests.

## Environment

See `.env.example`. Do not commit `.env`.

## Smoke test

With PostgreSQL, ML service, and this API running:

```text
npm run smoke
```
