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
- ERP-style Mini App at `/miniapp` with a responsive sidebar, separate order and review status pages, order detail/edit dialogs, inventory controls, and sales reports
- Pending orders can be edited before confirmation, including items, quantities, prices, customer details, fulfillment, and fees; stock reservations are adjusted transactionally
- Sales analytics provide daily, weekly, monthly, and yearly order totals, period-over-period revenue comparison, average order value, best sellers by units and revenue, top-product rankings, and current available stock
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
- Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in server environment variables to enable checkout and review alerts, Mini App sign-in alerts, and notifications for successful order, review, stock, and price actions.
- Set `MINIAPP_LOGIN_PHONE`, `MINIAPP_LOGIN_PASSCODE`, and `MINIAPP_SESSION_SECRET` as private deployment environment variables to enable direct `/miniapp` login. Use a unique random session secret and never commit these values; the login session expires after 12 hours.
- Add a production email provider (Resend, Postmark, SMTP, etc.) to send order emails; this starter does not claim email is active until configured.
- Connect and verify a persistent production database before accepting real orders.
- Configure actual delivery areas/fees, store policies, privacy/terms and payment arrangements.
- Test order creation, duplicate submissions, notification failures, stock validation, security, accessibility, and mobile checkout before launch.

## Routes
`/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/order-confirmation`, `/miniapp`, `/recipes`, `/about`, `/contact`, `/delivery`, `/pickup`, `/privacy`, `/terms`.

## Telegram notifications
Checkout orders and submitted product reviews notify the configured Telegram chat. Successful Mini App sign-ins and management actions (order confirmation/rejection/edits, review approval/rejection, stock updates, and price changes) also send notifications. If Telegram is unavailable, the saved management action still succeeds; the Mini App reports that the notification could not be sent and the server logs the delivery failure.
