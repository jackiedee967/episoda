# Database Setup Instructions

## Running the Migration

To add the `shows` and `episodes` tables to your Supabase database:

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy the contents of `supabase/migrations/create_shows_episodes_tables.sql`
6. Paste into the SQL editor
7. Click **Run** to execute the migration

## What This Creates

### Tables
- **shows**: TV show metadata from Trakt/TVMaze APIs
- **episodes**: Individual episode data linked to shows

### Security
- Row Level Security (RLS) enabled on both tables
- Only authenticated users can read/insert data
- Updates restricted to service role (admin only)

### Indexes
Performance indexes on:
- `trakt_id`, `imdb_id` (shows lookup)
- `show_id`, `trakt_id`, `season/episode` (episodes lookup)

### Constraints
- Rating values: 0-10
- Season numbers: >= 0
- Episode numbers: >= 1
- Unique constraint on (show_id, season_number, episode_number)

## After Running

Once the migration completes successfully:
1. TypeScript errors in `services/showDatabase.ts` should resolve
2. Clicking shows in search will work correctly
3. Shows will be saved to your database before navigation
