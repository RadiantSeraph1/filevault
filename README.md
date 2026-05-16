# File Vault

A read-only file storage and review web app built with Next.js for Vercel.

## Features

- Upload files into Vercel Blob when `BLOB_READ_WRITE_TOKEN` is configured.
- Local development fallback stores files under `.data/`.
- Browse uploaded files from a left-side document list.
- Preview Markdown, plain text, JSON, CSV, images, PDFs, and DOCX files.
- Open PPT/PPTX files through Microsoft Office's public viewer when deployed with public Blob URLs.
- Add comments to files without exposing any editing controls.

## Local Development

```powershell
npm.cmd install
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Vercel Blob credentials, uploads are saved locally in `.data/`. This is only for development and is intentionally ignored by Git.

## Vercel Storage Setup

1. Create or link the project on Vercel.
2. Add Vercel Blob from the Vercel dashboard or marketplace.
3. Pull the generated environment variables locally.
4. Add the auth and email environment variables.

```powershell
npx.cmd vercel env pull .env.local --yes
```

The app automatically switches from local storage to Vercel Blob when `BLOB_READ_WRITE_TOKEN` exists.

## Auth And Email Setup

Access is invite-only. The configured owner creates the first owner account, then only that owner can send invites. Invited users receive a Brevo email, open the setup link, and set their own password.

Required environment variables:

```env
AUTH_SECRET=replace-with-at-least-32-random-characters
OWNER_EMAIL=samac1234qwerty@gmail.com
OWNER_SETUP_CODE=replace-with-a-private-one-time-setup-code
BREVO_API_KEY=replace-with-your-brevo-api-key
BREVO_SENDER_EMAIL=verified-sender@example.com
BREVO_SENDER_NAME=File Vault
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

Do not commit `.env.local`. The Brevo key should be set in Vercel project environment variables.

First-time owner setup:

1. Deploy or run locally.
2. Open `/login`.
3. Use `OWNER_EMAIL`, `OWNER_SETUP_CODE`, and a new password.
4. Open `/admin` to grant access by email.

## Deployment

```powershell
npm.cmd run lint
npm.cmd run build
npx.cmd vercel deploy
```

For production:

```powershell
npx.cmd vercel deploy --prod
```

## Implementation Notes

- File metadata, comments, users, and invites are stored in private Blob-backed JSON indexes.
- Uploaded file content is stored under `file-room/uploads/`.
- DOCX preview uses `mammoth` in the browser and is read-only.
- Markdown preview uses `react-markdown` with GitHub-flavored Markdown.
- PPT/PPTX preview needs a public URL because Office's viewer cannot read local development files.
- For high-concurrency production usage, move metadata and comments to Neon Postgres or another database to avoid JSON index write conflicts.
