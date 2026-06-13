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

Sticker artwork uses OpenMoji SVG assets via jsDelivr CDN.

All emojis designed by [OpenMoji](https://openmoji.org/) - the open-source emoji and icon project. License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
