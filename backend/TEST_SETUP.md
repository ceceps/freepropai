# Test Setup Guide

## ✅ TypeScript Type Checking - PASSED

All TypeScript types are correct and validated.

```bash
bun run typecheck
# ✅ No errors found
```

## 🧪 Unit Tests Setup

### Prerequisites

1. **Separate Test Database** (Recommended)
   ```bash
   # Create a test database
   createdb freepropai_test
   ```

2. **Test Environment Variables**
   Create `backend/.env.test`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=freepropai_test
   DB_USER=your_username
   DB_PASSWORD=your_password
   
   PORT=3002  # Different port from dev server
   NODE_ENV=test
   
   AGENTROUTER_API_KEY=your_api_key_here
   AGENTROUTER_API_URL=https://api.agentrouter.com/v1
   LLM_MODEL=claude-3-5-sonnet-20241022
   
   UPLOAD_DIR=./uploads_test
   MAX_FILE_SIZE=10485760
   CORS_ORIGIN=http://localhost:5173
   ```

3. **Run Migrations on Test Database**
   ```bash
   # Set test database in .env temporarily or use:
   DB_NAME=freepropai_test bun run db:push
   ```

### Running Tests

```bash
# Stop dev server first (to free port 3001)
# Or use different port in .env.test

# Run all tests
bun run test:run

# Run tests in watch mode
bun run test

# Run tests with UI
bun run test:ui

# Run tests with coverage
bun run test:coverage
```

## 📋 Test Coverage

### API Endpoints Tested (23 tests)

#### POST /api/listings
- ✅ Create listing without photos
- ✅ Create listing with photos
- ✅ Validate required fields
- ✅ Validate data types

#### GET /api/listings
- ✅ Get all listings
- ✅ Filter by status
- ✅ Handle empty results

#### GET /api/listings/:id
- ✅ Get listing with full details
- ✅ Handle 404 for non-existent listing
- ✅ Handle invalid UUID

#### PATCH /api/listings/:id
- ✅ Update listing fields
- ✅ Handle 404 for non-existent listing
- ✅ Allow partial updates

#### DELETE /api/listings/:id
- ✅ Delete listing
- ✅ Handle 404 for non-existent listing
- ✅ Cascade delete photos and descriptions

#### POST /api/listings/:id/generate-descriptions
- ✅ Generate 3 description variants (LLM integration)
- ✅ Handle 404 for non-existent listing
- ✅ Handle LLM errors gracefully

#### PATCH /api/listings/:listingId/descriptions/:descId/select
- ✅ Select description variant
- ✅ Handle 404 for non-existent description

#### DELETE /api/listings/photos/:photoId
- ✅ Delete photo
- ✅ Handle 404 for non-existent photo

## 🔧 Test Configuration

### Vitest Config (`vitest.config.ts`)
- Environment: Node.js
- Setup file: `src/__tests__/setup.ts`
- Coverage provider: v8

### Test Setup (`src/__tests__/setup.ts`)
- Automatic database cleanup after each test
- Ensures clean state for each test

## 📝 Notes

1. **Database Cleanup**: Tests automatically clean up data after each test
2. **LLM Tests**: Tests that call LLM have 30-second timeout
3. **Port Conflict**: Make sure dev server is not running on same port
4. **Test Database**: Use separate database to avoid affecting dev data

## 🚨 Current Status

- ✅ **TypeCheck**: All types validated successfully
- ⚠️ **Unit Tests**: Require database setup before running
- ✅ **Test Files**: All 23 tests written and ready

## 🎯 Next Steps

1. Setup test database: `createdb freepropai_test`
2. Create `.env.test` with test database credentials
3. Run migrations on test database: `DB_NAME=freepropai_test bun run db:push`
4. Stop dev server or use different port
5. Run tests: `bun run test:run`

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Drizzle ORM Testing](https://orm.drizzle.team/docs/testing)
