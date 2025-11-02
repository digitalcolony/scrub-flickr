# Scrub Flickr — Personal Photo Triage for Your Flickr Account

Scrub Flickr is a fast, keyboard-friendly triage tool for managing a personal Flickr account. It helps you review photos quickly, keep the good ones, and queue the rest for deletion — safely and intentionally — using Flickr's official API and OAuth 1.0a.

This app is designed for one person managing their own Flickr library. It does not store your data on any server; authentication happens via Flickr, and tokens live in your browser while you're using the app.

## Why this exists

If you've accumulated thousands of photos over the years, bulk cleanup can be painful. This app focuses on speed and safety:

- A focused triage screen shows one photo at a time with clear Keep/Delete actions
- Keyboard shortcuts let you move fast without the mouse
- A working set stays topped up so you rarely wait for fetches
- Public photos are clearly labeled, and you can require a confirm before deleting them
- A Delete Queue view lets you review what’s about to be deleted before committing

## What you can do

- Sign in with Flickr via OAuth 1.0a (delete permission)
- See your own photos and triage them with Keep/Delete
- Use keyboard shortcuts: K or ← to Keep, D or → to Delete
- See a “Public” badge directly under the title when a photo is public
- Opt into a confirmation modal before deleting public photos
- Review and manage the Delete Queue before actual deletion

## Tech stack

- Frontend: React 19 + Vite, Tailwind CSS, Zustand, React Router
- API client: Axios + OAuth 1.0a signing (client+server coordination)
- Backend (local only): Node.js/Express OAuth proxy (for Flickr’s OAuth 1.0a and REST calls)

## Requirements

- Node.js 18+ (server relies on global fetch)
- npm 8+
- A Flickr account (use a test account while you verify deletion flows)
- Flickr API Key and Secret (created in your Flickr account)

## Quick start (local)

1. Clone and install

```bash
git clone https://github.com/digitalcolony/scrub-flickr.git
cd scrub-flickr
npm install
cd server && npm install && cd ..
```

2. Create environment file at the repo root: `.env.local`

```bash
# Required
VITE_FLICKR_API_KEY=your_flickr_api_key
VITE_FLICKR_API_SECRET=your_flickr_api_secret
VITE_FLICKR_CALLBACK_URL=http://localhost:5173/auth/callback

# Optional
VITE_OAUTH_PERMISSIONS=delete
```

3. Start the local OAuth proxy (terminal 1)

```bash
cd server
npm run dev
# Server will run on http://localhost:3001
```

4. Start the frontend (terminal 2)

```bash
npm run dev
# Vite dev server runs on http://localhost:5173 (strict port)
```

5. Open the app

```
http://localhost:5173
```

Sign in with Flickr when prompted. If you used real API keys in `.env.local`, the app will use the real OAuth flow. In development, if keys are missing or look like placeholders, it falls back to a mock flow so you can still explore the UI.

## Set up your Flickr app (once)

1. Go to: https://www.flickr.com/services/apps/create/
2. Create an app and obtain your API Key and Secret
3. Set the callback URL to:

```
http://localhost:5173/auth/callback
```

4. Choose permissions: delete (the app needs delete permission to remove photos)
5. Copy the Key and Secret into `.env.local` as shown above

Notes:

- The local server reads `.env.local` from the repository root (it does not use `server/.env`)
- CORS on the server is locked to `http://localhost:5173`
- The Vite dev server is configured with `strictPort: true` on 5173; if the port is busy, it will exit rather than auto-switch

## Safety and scope

- This tool is meant for a single person managing their own Flickr account
- Deletion is real and permanent. Use a test account until you're confident
- You can enable “Confirm before deleting Public photos” in the triage screen for extra safety
- Rate limiting is respected via a lightweight limiter; big delete sessions may pause to avoid API limits

## Project scripts

Root (frontend):

```bash
npm run dev       # Start Vite dev server on 5173
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Lint the project
```

Server (OAuth proxy):

```bash
cd server
npm run dev       # Start with nodemon on http://localhost:3001
npm start         # Start once (node index.js)
```

## Troubleshooting

- Verify the server is running and has your env vars:

```
http://localhost:3001/health
```

- If the frontend fails to start on 5173, free the port (strictPort is on) and try again
- Make sure `.env.local` is in the repository root and contains real Flickr keys
- If you see “Unable to connect to OAuth server,” ensure the server is running on port 3001
- If you change the frontend port or origin, update the server CORS origin in `server/index.js`

## Folder structure

```
backend/          # (reserved)
frontend/         # (reserved)
server/           # Local OAuth proxy server (Express)
src/              # React app (triage UI)
specs/            # Design docs, specs, plans (archived where noted)
```

## License and attribution

This project uses the Flickr API but is not endorsed or certified by Flickr. Review Flickr’s API Terms before using delete functionality on a primary account. Licensed under MIT.
