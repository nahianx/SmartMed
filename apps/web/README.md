# SmartMed Web Application

Next.js frontend application for the SmartMed Healthcare Management System.

## Features

- **Patient Portal**: View medical history, book appointments, access prescriptions
- **Doctor Portal**: Manage appointments, view patient records, write prescriptions
- **Admin Dashboard**: System management and analytics
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- TanStack Query for data fetching
- Zustand for state management

## Development

```bash
# Install dependencies (from root)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

The app will be available at http://localhost:3000

## Environment Variables

Create a `.env.local` file:

```
API_URL=http://localhost:4000
```

## Project Structure

```
src/
├── app/              # App router pages
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   └── globals.css   # Global styles
└── components/       # React components (to be added)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
