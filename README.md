# Milano Foods Storefront

Premium, responsive Milano Foods storefront built with Next.js App Router and TypeScript.

## Included
- Responsive homepage and brand design system
- Product catalog with category filters and search
- Product detail pages
- Client-side shopping cart persisted in local storage
- Checkout with delivery/pickup choice and payment preference
- Order confirmation page
- Recipes, About, Contact, Delivery, Pickup, Privacy and Terms pages
- Server-side order API validation and optional Telegram notification
- Inventory management Mini App at `/miniapp` with Overview, Inventory, Orders, and Reviews pages; includes filters, order actions, review moderation, restocking, stock movement history, and product price management
- No customer account or order tracking page

## Run locally
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and configure the required database and Telegram details.
4. For direct Mini App login, set `MINIAPP_LOGIN_PHONE`, `MINIAPP_LOGIN_PASSCODE`, and a random `MINIAPP_SESSION_SECRET` (at least 32 characters) in `.env.local`.
5. Apply database migrations with `npx prisma migrate deploy`.
6. Run `npm run dev`.
7. Open http://localhost:3000.

## Important before production
- Replace sample prices, provisional product imagery, contact details and pickup locations with verified Milano information.
- Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in server environment variables to enable Telegram order alerts.
- Set `MINIAPP_LOGIN_PHONE`, `MINIAPP_LOGIN_PASSCODE`, and `MINIAPP_SESSION_SECRET` as private deployment environment variables to enable direct `/miniapp` login. Use a unique random session secret and never commit these values; the login session expires after 12 hours.
- Add a production email provider (Resend, Postmark, SMTP, etc.) to send order emails; this starter does not claim email is active until configured.
- Connect a persistent database before accepting real orders. The API currently validates and notifies but does not persist orders in a database.
- Configure actual delivery areas/fees, store policies, privacy/terms and payment arrangements.
- Test order creation, duplicate submissions, notification failures, stock validation, security, accessibility, and mobile checkout before launch.

## Routes
`/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/order-confirmation`, `/miniapp`, `/recipes`, `/about`, `/contact`, `/delivery`, `/pickup`, `/privacy`, `/terms`.

## Order notifications
The `/api/orders` endpoint validates submitted checkout data and sends a Telegram notification if Telegram environment variables are set. Add a persistent database and an email provider before production.
