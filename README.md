# AgriGuide — Production-minded online shop starter

This is a **deployable starter**, not a fully launched production store. It includes a responsive storefront, a Node.js/Express API, persistent SQLite storage, server-side validation, basic rate limiting/security headers, product reviews, and order creation.

## Requirements
- Node.js 20 or newer
- npm

## Run locally
1. Extract the ZIP and open the project folder in VS Code.
2. Copy `.env.example` to `.env`.
3. In a terminal in the project root:
   ```bash
   npm install
   npm run init-db
   npm start
   ```
4. Open `http://localhost:3000`.

The server creates the database and seeds demo products automatically. Data is stored in `data/agriguide.sqlite`.

## Included
- Responsive product catalogue and category filters
- Search, product detail, cart, quantity updates and checkout form
- Server-side order validation and persistent order records
- Reviews saved in the database
- Farm delivery rule enforced by the server: only orders **below ₹10,000** can select farm delivery (change this policy only after the shop confirms it)
- Bulk-order note for orders of ₹20,000+ (not an automatic discount; actual offers must be configured by the shop)
- Security headers, request rate limiting, parameter validation, and environment configuration
- API health and product endpoints

## Important limits before taking real customer orders
This project does **not** yet include real payment processing, customer accounts, email/SMS confirmations, admin inventory dashboard, tax/invoice rules, delivery-area verification, backups, or deployment configuration. Do not accept real payments or store sensitive customer data until those are implemented and tested.

### Production launch checklist
- Configure and test a payment provider (e.g. Razorpay/Stripe) using server-side order creation and verified webhooks. Never collect card details directly in this app.
- Add authentication with secure sessions, password hashing, CSRF protection where applicable, and role-based admin access.
- Replace SQLite with managed PostgreSQL for a multi-instance deployment; configure automated backups and migrations.
- Configure HTTPS, domain, secrets, monitoring, logs, rate limits, and security updates.
- Confirm shop address, contact number, prices, stock, delivery zones, refund/privacy policies, GST/invoice requirements, and real customer reviews.
- Test accessibility, mobile layouts, order edge cases, and restore-from-backup procedures.

## API
- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/reviews?productId=1`
- `POST /api/reviews`
- `POST /api/orders`

## Viva quick guide
- HTML: semantic page structure.
- CSS: responsive layout using Grid/Flexbox and media queries.
- JavaScript: fetches products, renders cards, maintains a cart, submits orders.
- Express: receives API requests and validates input.
- SQLite: persists products, reviews, and orders between server restarts.
- Server-side validation: the browser is not trusted to enforce order rules.
