# PhiFit

Mobile-first fitness challenge web app for friends to run multi-week competitions with points, leaderboards, and token-based side challenges.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS 4
- **Authentication**: Email + PIN with Argon2 hashing
- **Sessions**: JWT (jose)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/chipstar5000/phifit.git
cd phifit
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your database URL and JWT secret.

4. Generate Prisma client:
```bash
npm run db:generate
```

5. Push database schema (for development):
```bash
npm run db:push
```

Or run migrations (for production):
```bash
npm run db:migrate
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Database Schema

The app uses the following main models:

- **User**: Email + PIN authentication, display name
- **Challenge**: Multi-week fitness challenges with payout configuration
- **Participant**: Users enrolled in challenges
- **TaskTemplate**: Weekly repeating tasks (e.g., "Run 3 miles")
- **Week**: Time-bounded periods with status (Upcoming/Open/Locked)
- **Completion**: Task completion records (honor system)
- **TokenLedger**: Token economy for side challenges
- **SideChallenge**: Head-to-head token-staked competitions
- **SideChallengeSubmission**: Results submitted by participants

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

## Project Status

- [x] Project setup & infrastructure
- [x] Email + PIN authentication
- [ ] Challenge & task management
- [ ] Weekly completions & lifecycle
- [ ] Leaderboards & payouts
- [ ] Token system
- [ ] Side challenges
- [ ] Organizer admin features
- [ ] Mobile-first UI polish

## License

ISC
