# Clone Zola Chat

Fullstack realtime chat MVP inspired by modern Vietnamese chat web apps without copying Zalo branding or assets.

## Structure

- `frontend`: React + Vite client.
- `backend`: Node.js + Express API, MongoDB + Mongoose, Google OAuth foundation.

## Setup

1. Install Node.js 20+.
2. Copy env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Fill MongoDB and Google OAuth credentials in `backend/.env`.
4. Install dependencies:

```bash
npm run install:all
```

5. Run development servers:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## Sticker Attribution

Sticker artwork uses Microsoft Fluent Emoji 3D assets from GitHub.

Fluent Emoji is a collection of familiar, friendly, and modern emoji from Microsoft. License: [MIT](https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE).
