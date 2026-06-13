This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Features
- **Application Tracking**: Manage application lifecycle stages in List or interactive Kanban Board views.
- **Native DOCX Editor**: Edit tailored resumes directly in the browser with full Microsoft Word formatting preservation (via `@eigenpal/docx-editor-react`).
- **Live Resume Analysis**: Modular checklist analyzer evaluates your live resume against the job description for ATS formatting, action verbs, and keyword matching.
- **Analytics Dashboard**: Automatic calculations of interview success rates, active applications, and lifecycle conversions.
- **Company Tracking**: Rate and track companies with "Do Not Apply" list integration.

## Google OAuth Setup

This application supports production-grade Google Authentication. To enable "Sign in with Google" on the login and registration pages, configure the following credentials in your `.env.local` file:

1. **Create a Google Cloud Project**:
   - Visit the [Google Cloud Console](https://console.cloud.google.com).
   - Create a new project (e.g., `aworkapp`).

2. **Configure OAuth Consent Screen**:
   - Navigate to **API & Services > OAuth consent screen**.
   - Set user type to **External** (or Internal if testing inside an organization).
   - Complete the required app name and developer contact email details.
   - Add the `openid`, `../auth/userinfo.email`, and `../auth/userinfo.profile` scopes.

3. **Generate Credentials**:
   - Go to **API & Services > Credentials**.
   - Click **+ CREATE CREDENTIALS** and select **OAuth client ID**.
   - Choose **Web application** as the application type.
   - Under **Authorized JavaScript origins**, add:
     - `http://localhost:3000` (for local development)
   - Under **Authorized redirect URIs**, add:
     - `http://localhost:3000/api/auth/google/callback` (for local development)
     - `https://yourdomain.com/api/auth/google/callback` (for your production domain)
   - Save to obtain your **Client ID** and **Client Secret**.

4. **Update Environment Variables**:
   Add the copied credentials to your `.env.local` file:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
