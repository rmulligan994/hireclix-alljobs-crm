# Supabase Auth Email Setup

Configure custom SMTP and redirect URLs so auth emails (signup confirmation, password reset) use your domain and redirect correctly.

## 1. Custom SMTP (Mask Supabase Email)

By default, Supabase sends auth emails from `noreply@<project>.supabase.co`. To use your own domain (e.g. `noreply@yourcompany.com`):

1. Go to **Supabase Dashboard** → **Authentication** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Configure your provider (Mailgun, Resend, SendGrid, etc.):

| Field | Example (Mailgun) |
|-------|-------------------|
| Sender email | `noreply@mg.yourcompany.com` |
| Sender name | `Your CRM` |
| Host | `smtp.mailgun.org` |
| Port | `587` (TLS) or `465` (SSL) |
| Username | Your Mailgun SMTP username |
| Password | Your Mailgun SMTP password |

4. Save. New auth emails will use your sender address.

**Note:** You already use Mailgun for campaigns. Create a separate sending domain or use the same one. Ensure the domain is verified in Mailgun.

## 2. URL Configuration (Fix localhost Redirect)

When confirmation links expire or fail, Supabase redirects to your **Site URL**. If this is `http://localhost:3000`, users see localhost in the URL.

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Set **Site URL** to your production URL, e.g.:
   - `https://your-site.webflow.io`
   - `https://your-site.webflow.io/crm` (if using base path)
3. Add **Redirect URLs** (one per line):
   - `https://your-site.webflow.io/**`
   - `https://your-site.webflow.io/crm/**` (if using base path)
   - `http://localhost:3000/**` (for local dev)

## 3. App Environment Variable

Set `NEXT_PUBLIC_APP_URL` so confirmation emails link to production, not localhost:

```
NEXT_PUBLIC_APP_URL=https://your-site.webflow.io
# Or with base path:
NEXT_PUBLIC_APP_URL=https://your-site.webflow.io/crm
```

In Webflow Cloud, add this to your environment variables.

## 4. Expired Link Handling

The app now handles expired confirmation links:

- Detects `#error=access_denied&error_code=otp_expired` in the URL
- Redirects to `/auth?error=otp_expired`
- Shows a friendly message with a "Resend confirmation email" form
- User enters email and receives a new link
