# Milano Foods Storefront

Premium, responsive Milano Foods storefront built with Next.js App Router and TypeScript.

## Included
- Responsive homepage and brand design system
- Product catalog with category filters and search
- Three storefront product families—Mojito Syrup, Ice Cream Powder, and Milkshake—with flavor, style, format, and pack-size filtering
- Product detail pages
- Database-backed per-SKU flavor, style, weight/volume, image galleries, carton configuration, minimum quantities, and explicitly enabled promotions
- Wholesale cart pricing derived only from each SKU's individual unit price; carton counts multiply base-unit quantity and inventory reservations
- Client-side shopping cart persisted in local storage
- Checkout with delivery/pickup choice and payment preference
- Optional checkout payments through CBE, Telebirr, Awash Bank, or Bank of Abyssinia; admins configure account names and numbers in the Mini App, and customers can optionally attach a payment screenshot
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
- Products remain hidden from the storefront until published. In Mini App → Inventory, choose **Add product** to add another flavor or variant, or **Add category** to create a product family. New products start at zero price and stock; open their inventory details to set a price and add stock before publishing. Publishing requires both a positive price and available stock.
- Upload product photos in product details and category photos in Inventory → Category photos. Only PNG/JPG images up to 2 MB are accepted; uploaded images are stored in the database so they persist on serverless deployments. Categories appear in the storefront once they contain at least one published product.
- Each product row is an independently priced and stocked SKU (flavor/type/size). In product details, configure carton choices as one `Label=units` entry per line; single-unit sale is always available. Stock, reservations, and order quantities remain individual units. The optional promotion is inactive unless explicitly enabled. After applying the product packaging migration, regenerate Prisma Client with `npx prisma generate`.
- Configure and enable payment accounts in the Mini App's Payment accounts section before they appear at checkout. Payment selection and screenshot upload are optional; uploaded screenshots are stored with the order in the database and visible only to authenticated Mini App admins.
- Test order creation, duplicate submissions, notification failures, stock validation, security, accessibility, and mobile checkout before launch.

## Routes
`/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/order-confirmation`, `/miniapp`, `/recipes`, `/about`, `/contact`, `/delivery`, `/pickup`, `/privacy`, `/terms`.

## Telegram notifications
Checkout orders and submitted product reviews notify the configured Telegram chat. Successful Mini App sign-ins and management actions (order confirmation/rejection/edits, review approval/rejection, stock updates, and price changes) also send notifications. If Telegram is unavailable, the saved management action still succeeds; the Mini App reports that the notification could not be sent and the server logs the delivery failure.
