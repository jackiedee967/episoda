# EPISODA Scaling Guide - 1M Users

This guide covers the infrastructure changes needed to scale EPISODA to 1 million users.

## Current Status

- Database: Supabase Free Tier
- Caching: In-app AsyncStorage + memory cache
- Pagination: Implemented with limits

## Phase 1: Pre-Launch (Current)

### Already Implemented

1. **Database Performance Indexes** (`migrations/004_performance_indexes.sql`)
   - Composite indexes for feeds, notifications, comments
   - Run in both Dev and Prod SQL Editor

2. **Query Pagination**
   - All list queries now have limits (max 500-1000)
   - `getEpisodesWatchedCount` uses SQL COUNT instead of fetching all rows
   - `getCommunityPosts` limits fetch to 10x requested limit (max 100)

3. **TV Show Metadata Caching** (`services/showCache.ts`)
   - Memory cache (LRU, 100 items)
   - AsyncStorage persistence (24h TTL)
   - Applied to: `getShowDetails`, `getShowSeasons`, `getSeasonEpisodes`

## Phase 2: Before Launch (You Need To Do)

### 1. Upgrade Supabase Plan

**When:** Before marketing push / user acquisition
**Where:** Supabase Dashboard > Organization > Billing

| Plan | Users | Database | Price |
|------|-------|----------|-------|
| Free | 0-500 | 500MB, shared CPU | $0 |
| Pro | 500-50K | 8GB, dedicated CPU | $25/mo |
| Team | 50K-500K | 16GB, more compute | $599/mo |
| Enterprise | 500K+ | Custom | Contact |

**Recommendation:** Start with Pro ($25/mo), upgrade when DAU > 10K

### 2. Enable Connection Pooling

**When:** At launch
**Where:** Supabase Dashboard > Database > Settings > Connection Pooling

1. Enable "Transaction" mode pooler
2. Update connection string in production to use pooler URL
3. Set pool size based on plan (Pro: 100 connections)

### 3. Enable Point-in-Time Recovery

**When:** Before real users
**Where:** Supabase Dashboard > Database > Backups

1. Enable PITR (Pro plan required)
2. Set retention period (7 days minimum)
3. Test restore process in Dev first

## Phase 3: Growth (10K-100K Users)

### 1. Add Read Replicas

**When:** DAU > 10K or read latency > 200ms
**Where:** Supabase Dashboard > Database > Replication

- Route read-heavy queries (feeds, search) to replica
- Keep writes on primary

### 2. Implement Rate Limiting

Add to your API routes:
```typescript
// Example: 100 requests per minute per user
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;
  
  const timestamps = rateLimiter.get(userId) || [];
  const recent = timestamps.filter(t => now - t < windowMs);
  
  if (recent.length >= maxRequests) return false;
  
  recent.push(now);
  rateLimiter.set(userId, recent);
  return true;
}
```

### 3. Upgrade External API Limits

- **Trakt:** Contact for higher rate limits
- **TMDB:** Consider caching posters in Supabase Storage
- **OMDB:** Enterprise tier if needed

## Phase 4: Scale (100K-1M Users)

### 1. Background Job Queue

For heavy operations like:
- Push notification batching
- Recommendation recalculation
- Feed pre-generation

Consider: Supabase Edge Functions + pg_cron

### 2. CDN for Static Assets

- Host show posters on CDN
- Cache API responses at edge
- Consider Cloudflare or Vercel Edge

### 3. Database Sharding

Only if single database becomes bottleneck:
- Shard by user_id for user-specific data
- Keep shared data (shows, episodes) on primary

## Monitoring Checklist

### Weekly Checks
- [ ] Database size (< 80% of plan limit)
- [ ] Connection count (< 80% of pool size)
- [ ] Query latency (< 200ms p95)
- [ ] Error rates (< 0.1%)

### Monthly Checks
- [ ] API rate limit usage
- [ ] Storage growth rate
- [ ] Cost vs. user growth

## Emergency Procedures

### Database Full
1. Identify large tables: `SELECT pg_total_relation_size(table_name) FROM information_schema.tables`
2. Archive old data (posts > 1 year, notifications > 30 days)
3. Upgrade plan or add storage

### High Latency
1. Check slow query log
2. Add missing indexes
3. Enable read replica
4. Optimize N+1 queries

### Connection Exhausted
1. Enable connection pooling
2. Reduce pool connections per function
3. Add retry logic with exponential backoff

## Cost Estimates

| Users | Supabase | Total/Month |
|-------|----------|-------------|
| 1K | Pro ($25) | ~$30 |
| 10K | Pro ($25) | ~$50 |
| 100K | Team ($599) | ~$700 |
| 500K | Enterprise | ~$2,000 |
| 1M | Enterprise | ~$5,000 |

*Estimates include database, storage, and bandwidth. External APIs (Trakt, TMDB) have separate costs.*
