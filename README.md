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
4. Set `ADMIN_INITIAL_SETUP_CODE` to a private random value of at least 24 characters and set `MINIAPP_SESSION_SECRET` to at least 32 random characters.
5. Apply database migrations with `npx prisma migrate deploy`, then seed permission definitions with `npx prisma db seed`.
6. Start the Telegram bot in a private chat by pressing **Start**.
7. Open `/admin/login` or `/miniapp`, choose **First-time owner setup**, and register using the setup code and your numeric Telegram user ID. The first verified account receives all permissions; registration closes as soon as an admin account exists.
8. Remove `ADMIN_INITIAL_SETUP_CODE` from the deployment environment after owner registration.
9. Run `npm run dev` and open http://localhost:4000.

## Important before production
- Replace sample prices, provisional product imagery, contact details and pickup locations with verified Milano information.
- Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in server environment variables to enable checkout and review alerts, Mini App sign-in alerts, and notifications for successful order, review, stock, and price actions. Password recovery sends a six-digit code to the account's linked private Telegram; the bot must have been started by that account. Codes expire after 10 minutes and are rate-limited. Enter Telegram user IDs for staff accounts in Admin → Staff & Permissions. New staff accounts must change their temporary password at first sign-in before accessing Admin or the Mini App.
- To enable normal device push alerts for new orders, generate VAPID keys with `npx web-push generate-vapid-keys` and set `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, and `WEB_PUSH_SUBJECT` in private server/deployment variables. Apply the push-subscription migration with `npx prisma migrate deploy`. Sign in to `/admin` or the browser-installed `/miniapp`, then choose **Enable order alerts** and allow notifications. Telegram notifications remain enabled independently. Push is not available inside Telegram's embedded Mini App; use its existing Telegram alerts there.
- Android APK source is configured in `android/twa-manifest.json` for `com.milanofoods.ops` and `https://milanofoods.vercel.app/miniapp`. Deploy the site first so the Mini App manifest and 512px icon are available at that origin. To publish a signed APK, add the GitHub Actions secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`, then run **Build Android Mini App** from the repository's Actions tab. The workflow publishes a downloadable APK as a GitHub Release asset. Keep the signing keystore and passwords private and back them up; the same key is required for future app updates. Add the signing certificate's SHA-256 fingerprint (from `keytool -list -v -keystore <keystore-file>`) to the hosting variable `ANDROID_SHA256_CERT_FINGERPRINTS` so `/.well-known/assetlinks.json` verifies the Trusted Web Activity, and set `NEXT_PUBLIC_ANDROID_APK_URL` to the release asset URL (for example `https://github.com/Leuldam/Milanofoods/releases/latest/download/milano-foods-miniapp.apk`) to show an APK download link in the Mini App. APK building and signing are not available until these secrets are configured.
- Set `MINIAPP_SESSION_SECRET` as a private deployment environment variable (at least 32 random characters); Mini App sessions expire after 12 hours. `MINIAPP_LOGIN_PHONE` and `MINIAPP_LOGIN_PASSCODE` are optional legacy direct-login credentials; normal admin accounts can sign in to both Admin and Mini App.
- Database staff permissions are checked on each Mini App request; staff can only use actions allowed by their current permissions. Owner accounts and allow-listed Telegram operators retain full Mini App access. Admin and Mini App password sign-ins are throttled after eight failed attempts within 15 minutes.
- The admin at `/admin` and operations Mini App at `/miniapp` each have their own installable web-app manifest. Deploy behind HTTPS, open either URL in a supported mobile browser, then choose **Add to Home Screen** or **Install app**. Sign-in is still required after installation; private admin and inventory data are not available offline.
- Deploy the Next.js app to a Node.js host such as Vercel and provision a persistent PostgreSQL database. Configure `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_INITIAL_SETUP_CODE`, and `MINIAPP_SESSION_SECRET` in the host's private environment settings. Configure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_OPERATOR_IDS`, `TELEGRAM_WEBHOOK_SECRET`, and `TELEGRAM_SETUP_SECRET` if Telegram notifications/webhooks are used. Never commit production credentials.
- Before the first production release, run `npx prisma migrate deploy` and `npx prisma db seed` with the production database credentials. The seed creates permission definitions only. Register the first owner through `/admin/login` or `/miniapp`; registration is protected by `ADMIN_INITIAL_SETUP_CODE` and a private Telegram verification code, then permanently closes once an admin exists. Back up the database and verify the production site, admin login, Mini App login, checkout, and Telegram webhook after deployment. Do not use a local development database for production.
- Add a production email provider (Resend, Postmark, SMTP, etc.) to send order emails; this starter does not claim email is active until configured.
- Connect and verify a persistent production database before accepting real orders.
- Configure actual delivery areas/fees, store policies, privacy/terms and payment arrangements.
- Products remain hidden from the storefront until published. In Mini App → Inventory, choose **Add product** to add another flavor or variant, or **Add category** to create a product family. New products start at zero price and stock; open their inventory details to set a price and add stock before publishing. Publishing requires both a positive price and available stock.
- Product stock is never reset during deployment. Admin, Mini App, and the public storefront use the same live inventory; zero available units show as out of stock, and new products start at zero.
- Upload product photos in product details and category photos in Inventory → Category photos. Only PNG/JPG images up to 2 MB are accepted; uploaded images are stored in the database so they persist on serverless deployments. Categories appear in the storefront once they contain at least one published product.
- Each product row is an independently priced and stocked SKU (flavor/type/size). In product details, configure carton choices as one `Label=units` entry per line; single-unit sale is always available. Stock, reservations, and order quantities remain individual units. The optional promotion is inactive unless explicitly enabled. After applying the product packaging migration, regenerate Prisma Client with `npx prisma generate`.
- Configure and enable payment accounts in the Mini App's Payment accounts section before they appear at checkout. Payment selection and screenshot upload are optional; uploaded screenshots are stored with the order in the database and visible only to authenticated Mini App users with payment-view access.
- Test order creation, duplicate submissions, notification failures, stock validation, security, accessibility, and mobile checkout before launch.

## Routes
`/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/order-confirmation`, `/miniapp`, `/recipes`, `/about`, `/contact`, `/delivery`, `/pickup`, `/privacy`, `/terms`.

## Telegram notifications
Checkout orders and submitted product reviews notify the configured Telegram chat. Successful Mini App sign-ins and management actions (order confirmation/rejection/edits, review approval/rejection, stock updates, and price changes) also send notifications. If Telegram is unavailable, the saved management action still succeeds; the Mini App reports that the notification could not be sent and the server logs the delivery failure.
