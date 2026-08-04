# Drizzle ORM Setup Guide

## ✅ What's Already Done

- ✅ Drizzle ORM and Drizzle Kit installed
- ✅ Database schema defined in `src/db/schema.ts`
- ✅ Drizzle config created (`drizzle.config.ts`)
- ✅ Database connection wrapper created (`src/db/index.ts`)
- ✅ Server updated to test database connection on startup

## 📋 Setup Steps

### 1. Configure Environment Variables

Edit `backend/.env` file with your PostgreSQL credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=freepropai
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password

# Or use connection string
DATABASE_URL=postgresql://username:password@localhost:5432/freepropai

# LLM Configuration
AGENTROUTER_API_KEY=your_api_key_here
AGENTROUTER_API_URL=https://api.agentrouter.com/v1
LLM_MODEL=claude-3-5-sonnet-20241022

# Server
PORT=3001
NODE_ENV=development
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:5173
```

### 2. Create PostgreSQL Database

```bash
# Option 1: Using createdb command
createdb freepropai

# Option 2: Using psql
psql -U postgres
CREATE DATABASE freepropai;
\q
```

### 3. Generate Migration Files

```bash
cd backend
bun run db:generate
```

This will:
- Read your schema from `src/db/schema.ts`
- Generate SQL migration files in `drizzle/` folder
- Create a `meta/` folder with migration metadata

### 4. Apply Migrations to Database

```bash
bun run db:migrate
```

This will:
- Connect to your PostgreSQL database
- Execute all pending migrations
- Create all tables with proper constraints and indexes

### 5. (Optional) Push Schema Directly

If you want to push schema changes directly without generating migration files:

```bash
bun run db:push
```

⚠️ **Warning**: This is useful for development but not recommended for production.

### 6. (Optional) Open Drizzle Studio

Drizzle Studio is a visual database browser:

```bash
bun run db:studio
```

This will open a web interface at `https://local.drizzle.studio` where you can:
- Browse your tables
- View and edit data
- Run queries

## 🗂️ Database Schema

The following tables will be created:

### `leads`
- Lead information from WhatsApp chats
- Scoring (Hot/Warm/Cold)
- Budget, location, property preferences

### `follow_ups`
- Follow-up message drafts
- Approval queue (pending/approved/rejected/sent)
- Scheduled timestamps

### `listings`
- Property listing details
- Land area, building area, price
- Property type, location

### `listing_photos`
- Photos for each listing
- Photo order for display

### `listing_descriptions`
- AI-generated description variants
- Formal and casual versions
- Selection tracking

## 🔧 Available Scripts

```bash
# Generate migration files from schema
bun run db:generate

# Apply migrations to database
bun run db:migrate

# Push schema directly (dev only)
bun run db:push

# Open Drizzle Studio
bun run db:studio

# Start development server
bun run dev
```

## 📝 Using Drizzle in Your Code

### Import the database instance:

```typescript
import { db } from './db';
import { leads, listings, followUps } from './db/schema';
```

### Query examples:

```typescript
// Select all leads
const allLeads = await db.select().from(leads);

// Insert a new lead
const newLead = await db.insert(leads).values({
  name: 'John Doe',
  phone: '+6281234567890',
  score: 'Hot',
  status: 'new',
}).returning();

// Update a lead
await db.update(leads)
  .set({ status: 'contacted' })
  .where(eq(leads.id, leadId));

// Delete a lead
await db.delete(leads).where(eq(leads.id, leadId));

// Join query
const leadsWithFollowUps = await db
  .select()
  .from(leads)
  .leftJoin(followUps, eq(leads.id, followUps.leadId));
```

## 🚨 Troubleshooting

### Connection Error

If you get a connection error:
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify credentials in `.env` file
3. Ensure database exists: `psql -U postgres -l`

### Migration Error

If migration fails:
1. Check database permissions
2. Verify schema syntax in `src/db/schema.ts`
3. Try `bun run db:push` for direct schema push

### Schema Changes

When you modify `src/db/schema.ts`:
1. Run `bun run db:generate` to create new migration
2. Review the generated SQL in `drizzle/` folder
3. Run `bun run db:migrate` to apply changes

## 📚 Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit Docs](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

## ✅ Next Steps

After completing the setup:
1. Start the backend server: `bun run dev`
2. Verify database connection in console logs
3. Test API endpoints
4. Proceed with Phase 1 implementation (Listing Generator)
