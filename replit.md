# Kisan Hi-Tech Nursery Management System

Full-stack nursery management system for "Kisan Hi-Tech Nursery" (Kalloli, Belagavi).

## Tech Stack
- Frontend: React (Vite), Tailwind CSS, Shadcn UI, Wouter, Framer Motion, TanStack Query
- Backend: Express, Drizzle ORM
- Database: PostgreSQL

## Features
- Dashboard with live attendance and revenue metrics
- Seed Inward management
- Sowing Lots & Stock tracking
- Customer Orders with advance payments
- Employee management & Attendance
- Salary Slip generation
- Invoice printing with professional layout

## Recent Changes
- Fixed "Seed Inward" Edit Entry bug where the Variety dropdown was not auto-selecting the saved value.
- Implemented a safety guard in the variety reset `useEffect` and added a 150ms delay to ensure `filteredVarieties` are populated first.
- Fixed a duplicate `varieties` query declaration in `seed-inward.tsx` that caused a syntax error.
- Ensured all `Select` components in Seed Inward handle number-to-string conversion correctly.
- Successfully migrated and synced database schema.
