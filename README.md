# PhiFit

Mobile-first fitness challenge web app for friends to run multi-week competitions with points, leaderboards, and token-based side challenges.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS 4
- **Authentication**: Email + PIN with bcryptjs hashing
- **Sessions**: JWT (jose)
- **Deployment**: Vercel

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

## Features

### Challenge Management
- Create multi-week fitness challenges with customizable tasks
- Percentage-based prize pool distribution (weekly, grand prize, token champion)
- Automatic prize calculation based on participant count × buy-in
- Organizer admin tools for managing completions and participants
- Challenge deletion with hard confirmation (type challenge name)

### Tracking & Completion
- Weekly task completion tracking (honor system)
- Automatic week lifecycle management (Upcoming → Open → Locked)
- Admin ability to edit/add completions for any participant
- Perfect week detection (complete all tasks)

### Token System
- Earn 1 token per perfect week
- Token leaderboard tracks top performers
- Spend tokens to create side challenges

### Side Challenges
- Head-to-head competitions between participants
- Customizable metrics (higher wins, lower wins, target threshold)
- Token staking with automatic refunds on ties/voids
- Submission and resolution workflow

### Leaderboards
- Weekly leaderboard with split-prize support for ties
- Overall leaderboard across all locked weeks
- Token leaderboard for perfect week tracking
- Real-time rank updates

### Mobile-First Design
- Responsive UI optimized for mobile devices
- Touch-friendly interactions
- Fast page loads with Next.js 16

## Database Schema

The app uses the following main models:

- **User**: Email + PIN authentication, display name
- **Challenge**: Multi-week fitness challenges with percentage-based prize structure
- **Participant**: Users enrolled in challenges with buy-in tracking
- **TaskTemplate**: Weekly repeating tasks (e.g., "Run 3 miles")
- **Week**: Time-bounded periods with status (Upcoming/Open/Locked)
- **Completion**: Task completion records with audit trail
- **TokenLedger**: Token economy transactions (earn/spend)
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

✅ **Complete** - All core features implemented and deployed to production

- [x] Project setup & infrastructure
- [x] Email + PIN authentication
- [x] Challenge & task management (with deletion)
- [x] Weekly completions & lifecycle
- [x] Leaderboards & percentage-based payouts
- [x] Token system & perfect-week awards
- [x] Side challenges (head-to-head)
- [x] Organizer admin features
- [x] Mobile-first UI polish

### Recent Additions
- Prize structure converted to percentages (Dec 2024)
- Challenge deletion with hard confirmation (Jan 2025)
- Logout UX improvements (Jan 2025)

## License

ISC
