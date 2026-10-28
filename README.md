# PayNode API

Express 5 + MongoDB (Mongoose) + Zod. Firebase Auth identifies people; the database owns roles and profiles.

```bash
cp .env.example .env     # fill in the values
npm install
npm run dev              # http://localhost:5000
npm test                 # Vitest + Supertest, in-memory MongoDB
npm run seed:admin       # creates the first admin from ADMIN_EMAIL / ADMIN_NAME
```

Modules: users, employees, worksheets, payroll, payments (+ Stripe webhook), stats, contact.
Deploys to Vercel (`vercel.json`). The Stripe webhook is `POST /api/stripe/webhook` and needs `STRIPE_WEBHOOK_SECRET`.
The chat server lives in its own repo: `Paynode_realtime`.
