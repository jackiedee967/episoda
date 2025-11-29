# EPISODA Deployment Checklist

## Database Changes (Schema Updates)

When adding tables, columns, or changing the database structure:

### Step 1: Create Migration
- [ ] Create new file: `supabase/migrations/XXX_description.sql`
- [ ] Write your SQL (ALTER TABLE, CREATE TABLE, etc.)

### Step 2: Test in Development
- [ ] Go to EPISODA-Dev Supabase Dashboard
- [ ] Open SQL Editor
- [ ] Paste and run your migration
- [ ] Test in the app (run in Replit)
- [ ] Verify everything works

### Step 3: Deploy to Production
- [ ] Verify dev testing passed
- [ ] Go to EPISODA-Prod Supabase Dashboard
- [ ] (Optional) Create manual backup: Settings > Database > Backups
- [ ] Open SQL Editor
- [ ] Paste and run the same migration
- [ ] Test in production app

---

## App Updates (Code Changes)

### For UI/Feature Changes (OTA - Instant)
- [ ] Make changes in Replit
- [ ] Test locally
- [ ] Run: `eas update` (from Replit or EAS Dashboard)
- [ ] Users get update instantly

### For Native Changes (App Store - 1-3 days)
Native changes include: new permissions, native libraries, app.config.js changes

- [ ] Make changes in Replit  
- [ ] Test locally
- [ ] Run: `eas build --platform ios`
- [ ] Submit to App Store
- [ ] Wait for Apple approval (1-3 days)

---

## Pre-Launch Safety Checklist

Before ANY production deployment:

- [ ] Tested in dev environment
- [ ] Login/signup still works
- [ ] Existing user accounts not broken
- [ ] No console errors
- [ ] Tested on real iPhone (for native changes)

---

## Rollback Plan

### Database Issues
- Supabase keeps automatic backups
- Go to: Settings > Database > Backups > Restore

### App Issues (OTA)
- Run `eas update` with previous version
- Or revert code and push new update

### App Issues (App Store)
- Submit previous version to Apple
- Wait for approval (1-3 days)

---

## Environment Reference

| Environment | Database | When Used |
|-------------|----------|-----------|
| Development | EPISODA-Dev (atzrteveximvujzoneuu) | Replit, testing |
| Production | EPISODA-Prod (mbwuoqoktdgudzaemjhx) | Published app |
