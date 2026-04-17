# HireClix CRM - Development Implementation Plan

> **Total Estimated Time**: 122-180 hours  
> **Minimum Viable Production (P0 + P1)**: 12-20 hours  
> **Full Feature Parity (P0-P2)**: 42-60 hours

---

## 📋 Quick Reference

| Phase | Priority | Tasks | Est. Hours | Cumulative |
|-------|----------|-------|------------|------------|
| 1 | P0 - Blocking | 2 | 2-4h | 2-4h |
| 2 | P1 - High | 7 | 10-16h | 12-20h |
| 3 | P2 - Medium | 10 | 30-40h | 42-60h |
| 4 | P3 - Low | 12 | 80-120h | 122-180h |

---

## 🔴 PHASE 1: P0 - BLOCKING (Must Complete First)

### SEC-001: Implement Row Level Security (RLS)
**Time**: 2-4 hours | **Risk**: Critical - data exposure without this

**Steps**:
1. [ ] Create new migration file: `supabase/migrations/YYYYMMDD_rls_policies.sql`
2. [ ] Enable RLS on all tables:
   ```sql
   ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
   ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
   ALTER TABLE talent_pools ENABLE ROW LEVEL SECURITY;
   ALTER TABLE pipeline_candidates ENABLE ROW LEVEL SECURITY;
   ALTER TABLE talent_pool_candidates ENABLE ROW LEVEL SECURITY;
   ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
   ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
   ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
   ```
3. [ ] Create policies for each table (example for candidates):
   ```sql
   CREATE POLICY "Users can view own candidates" ON candidates
     FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Users can insert own candidates" ON candidates
     FOR INSERT WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can update own candidates" ON candidates
     FOR UPDATE USING (auth.uid() = user_id);
   CREATE POLICY "Users can delete own candidates" ON candidates
     FOR DELETE USING (auth.uid() = user_id);
   ```
4. [ ] Test policies in Supabase SQL editor
5. [ ] Run migration: `supabase db push`

---

### SEC-002: Fix Hardcoded Email Sender
**Time**: 15 minutes | **Risk**: Emails won't send properly

**File**: `supabase/functions/send-campaign-email/index.ts` (line 149)

**Steps**:
1. [ ] Open the file and locate line 149
2. [ ] Change `from: 'noreply@product.hireclix.com'`
3. [ ] Replace with environment variable: `from: Deno.env.get('EMAIL_FROM_ADDRESS') || 'noreply@yourdomain.com'`
4. [ ] Add `EMAIL_FROM_ADDRESS` to Supabase Edge Function secrets
5. [ ] Test email sending

---

### CFG-002: Configure Supabase Secrets
**Time**: 30 minutes | **Risk**: Email/editor features won't work

**Location**: Supabase Dashboard → Edge Functions → Secrets

**Steps**:
1. [ ] Get Mailgun API key from https://app.mailgun.com/app/account/security/api_keys
2. [ ] Add sending domain in Mailgun and get `MAILGUN_DOMAIN`
3. [ ] In Supabase Dashboard, add secrets:
   - `MAILGUN_API_KEY` = your-mailgun-key
   - `MAILGUN_DOMAIN` = mg.yourdomain.com
   - `MAILGUN_WEBHOOK_SIGNING_KEY` = from Mailgun webhook settings
4. [ ] Deploy edge functions: `supabase functions deploy`

---

## 🟠 PHASE 2: P1 - HIGH PRIORITY (Before Go-Live)

### BUG-001: Fix Talent Pool Update Bug
**Time**: 5 minutes | **Risk**: Talent pools cannot be updated

**File**: `src/services/talentPoolService.ts` (line 147)

**Steps**:
1. [ ] Open `src/services/talentPoolService.ts`
2. [ ] Find line 147: `.from('pipelines')`
3. [ ] Change to: `.from('talent_pools')`
4. [ ] Save and verify no TypeScript errors

---

### BUG-002: Connect Settings Forms to Backend
**Time**: 2-3 hours | **Risk**: Users can't save preferences

**File**: `src/pages/Settings.tsx`

**Steps**:
1. [ ] Import `userService` at top of file
2. [ ] Create state for form data in Profile tab
3. [ ] Add `onSubmit` handler for Profile form:
   ```typescript
   const handleProfileSave = async () => {
     try {
       await userService.updateProfile({
         full_name: formData.fullName,
         email: formData.email,
         // ... other fields
       });
       toast.success('Profile updated');
     } catch (error) {
       toast.error('Failed to update profile');
     }
   };
   ```
4. [ ] Wire "Save" button to handler
5. [ ] Repeat for Notification preferences (may need new table)
6. [ ] Test all save functionality

---

### DATA-001: Connect Activity Feed to Real Data
**Time**: 2-3 hours | **Risk**: Dashboard shows stale/fake data

**File**: `src/components/dashboard/ActivityFeed.tsx`

**Steps**:
1. [ ] Remove mock data (lines 5-42)
2. [ ] Import necessary hooks:
   ```typescript
   import { useCandidates } from '@/hooks/useCandidates';
   import { useCommunications } from '@/hooks/useCommunications';
   ```
3. [ ] Create query for recent activity:
   ```typescript
   const { data: recentCandidates } = useCandidates({ 
     limit: 10, 
     orderBy: 'created_at', 
     order: 'desc' 
   });
   ```
4. [ ] Transform data into activity items
5. [ ] Update component to render real data
6. [ ] Add loading state
7. [ ] Test with real database entries

---

### DATA-002: Connect Pipeline Chart to Real Data
**Time**: 2-3 hours | **Risk**: Pipeline visualization is inaccurate

**File**: `src/components/dashboard/PipelineChart.tsx`

**Steps**:
1. [ ] Remove mock data (lines 4-11)
2. [ ] Import pipeline hook:
   ```typescript
   import { usePipelines } from '@/hooks/usePipelines';
   ```
3. [ ] Query pipeline_candidates aggregated by stage:
   ```typescript
   const { data: stages } = useQuery({
     queryKey: ['pipeline-stages-summary'],
     queryFn: async () => {
       const { data } = await supabase
         .from('pipeline_candidates')
         .select('stage, count')
         .group('stage');
       return data;
     }
   });
   ```
4. [ ] Map stages to chart data format
5. [ ] Update Recharts component
6. [ ] Test with real pipeline data

---

### DATA-003: Connect Candidate Notes UI
**Time**: 1-2 hours | **Risk**: Notes feature appears broken

**File**: `src/pages/CandidateProfile.tsx`

**Steps**:
1. [ ] Import communication service:
   ```typescript
   import { useCommunications } from '@/hooks/useCommunications';
   ```
2. [ ] Fetch notes for candidate:
   ```typescript
   const { data: notes } = useCommunications({
     candidateId: id,
     type: 'note'
   });
   ```
3. [ ] Replace placeholder with real notes list
4. [ ] Add "Add Note" functionality
5. [ ] Test adding and viewing notes

---

### DATA-004: Connect Candidate Communications UI
**Time**: 1-2 hours | **Risk**: Communication history not visible

**File**: `src/pages/CandidateProfile.tsx`

**Steps**:
1. [ ] Fetch communications (emails, calls):
   ```typescript
   const { data: communications } = useCommunications({
     candidateId: id,
     type: ['email', 'call', 'meeting']
   });
   ```
2. [ ] Replace placeholder with communication timeline
3. [ ] Add icons/styling for different communication types
4. [ ] Test with real communication records

---

### ERR-001: Add React Error Boundary
**Time**: 1-2 hours | **Risk**: App crashes show blank screen

**Steps**:
1. [ ] Create `src/components/ErrorBoundary.tsx`:
   ```typescript
   import { Component, ErrorInfo, ReactNode } from 'react';
   
   interface Props { children: ReactNode; }
   interface State { hasError: boolean; error?: Error; }
   
   export class ErrorBoundary extends Component<Props, State> {
     state: State = { hasError: false };
     
     static getDerivedStateFromError(error: Error): State {
       return { hasError: true, error };
     }
     
     componentDidCatch(error: Error, errorInfo: ErrorInfo) {
       console.error('Error caught:', error, errorInfo);
     }
     
     render() {
       if (this.state.hasError) {
         return (
           <div className="flex flex-col items-center justify-center min-h-screen">
             <h1>Something went wrong</h1>
             <button onClick={() => window.location.reload()}>
               Reload Page
             </button>
           </div>
         );
       }
       return this.props.children;
     }
   }
   ```
2. [ ] Wrap App in `main.tsx` with ErrorBoundary
3. [ ] Test by throwing error in a component
4. [ ] Add error reporting (optional: Sentry)

---

## 🟡 PHASE 3: P2 - MEDIUM PRIORITY (Full Functionality)

### ANLYT-001: Real Source Distribution Data
**Time**: 2-3 hours

**File**: `src/pages/Analytics.tsx`

**Steps**:
1. [ ] Create query to aggregate candidates by source
2. [ ] Replace mock sourceData with real query
3. [ ] Handle empty state
4. [ ] Add refresh capability

---

### ANLYT-002: Real Conversion Funnel
**Time**: 2-3 hours

**File**: `src/pages/Analytics.tsx`

**Steps**:
1. [ ] Query pipeline_candidates grouped by stage
2. [ ] Calculate conversion rates between stages
3. [ ] Update funnel visualization
4. [ ] Add pipeline selector filter

---

### ANLYT-003: Timeline Data Implementation
**Time**: 3-4 hours

**File**: `src/pages/Analytics.tsx`

**Steps**:
1. [ ] Query candidates grouped by created_at month
2. [ ] Build time series data structure
3. [ ] Update timeline chart
4. [ ] Add date range filtering

---

### ANLYT-004: Date Range Picker
**Time**: 2-3 hours

**File**: `src/pages/Analytics.tsx`

**Steps**:
1. [ ] Add date-fns for date manipulation
2. [ ] Create date range state
3. [ ] Connect "Last 30 Days" button
4. [ ] Add custom date range picker
5. [ ] Filter all queries by date range

---

### ANLYT-005: Export Report Feature
**Time**: 3-4 hours

**File**: `src/pages/Analytics.tsx`

**Steps**:
1. [ ] Create CSV export utility function
2. [ ] Add "Export" button to UI
3. [ ] Generate CSV from current analytics data
4. [ ] Trigger browser download
5. [ ] (Optional) Add PDF export with jsPDF

---

### EMAIL-001: Email Tracking Webhooks
**Time**: 4-6 hours | **Status**: ✅ Implemented (Mailgun)

**Steps**:
1. [x] Create `supabase/functions/mailgun-webhook/index.ts`
2. [x] Set up Mailgun webhook endpoint
3. [x] Handle events: delivered, opened, clicked, failed
4. [x] Update campaign_recipients with opened_at, clicked_at
5. [ ] Configure webhook URL in Mailgun dashboard: `https://YOUR_PROJECT.supabase.co/functions/v1/mailgun-webhook`
6. [ ] Test with real email sends

---

### EMAIL-002: Unsubscribe Handling
**Time**: 3-4 hours

**Steps**:
1. [ ] Create unsubscribe edge function
2. [ ] Create `src/pages/Unsubscribe.tsx`
3. [ ] Add route in App.tsx
4. [ ] Add unsubscribed_at column to candidates
5. [ ] Filter unsubscribed from campaign sends
6. [ ] Add unsubscribe link to email templates

---

### EMAIL-003: Bounce Handling
**Time**: 2-3 hours

**Steps**:
1. [ ] Add bounce_count, last_bounced columns to candidates
2. [ ] Handle bounce webhook events
3. [ ] Mark emails as bounced
4. [ ] Prevent sending to bounced addresses
5. [ ] Add bounce indicator in UI

---

### SET-001: Team Invitation System
**Time**: 4-6 hours

**File**: `src/pages/Settings.tsx` (Team tab)

**Steps**:
1. [ ] Create team_invites table migration
2. [ ] Create invite service functions
3. [ ] Add invite form UI
4. [ ] Create invite email template
5. [ ] Handle invite acceptance flow
6. [ ] Display pending invites

---

### SET-002: Notification Preferences
**Time**: 2-3 hours

**Steps**:
1. [ ] Create user_preferences table
2. [ ] Add preference service functions
3. [ ] Connect UI toggles to database
4. [ ] Load preferences on mount
5. [ ] Save on change

---

### SET-003: Pipeline SLA Configuration
**Time**: 2-3 hours

**Steps**:
1. [ ] Add SLA columns to pipelines table
2. [ ] Create SLA settings UI
3. [ ] Save SLA per pipeline
4. [ ] Display SLA warnings in pipeline view

---

## 🟢 PHASE 4: P3 - LOW PRIORITY (Future Enhancements)

### AI-001: AI Copilot Integration
**Time**: 8-16 hours

**Steps**:
1. [ ] Choose AI provider (OpenAI/Anthropic)
2. [ ] Create AI edge function
3. [ ] Implement natural language search
4. [ ] Add email draft suggestions
5. [ ] Add pipeline recommendations
6. [ ] Create conversation UI

---

### AI-002: AI Candidate Summaries
**Time**: 4-6 hours

**Steps**:
1. [ ] Create summary generation function
2. [ ] Call on candidate profile load
3. [ ] Cache summaries
4. [ ] Add refresh button
5. [ ] Display in profile sidebar

---

### INT-001: LinkedIn Recruiter Integration
**Time**: 16-24 hours

**Steps**:
1. [ ] Set up LinkedIn API credentials
2. [ ] Implement OAuth flow
3. [ ] Create candidate import
4. [ ] Sync activity data
5. [ ] Add LinkedIn actions to candidate profile

---

### INT-002: Greenhouse ATS Integration
**Time**: 16-24 hours

**Steps**:
1. [ ] Get Greenhouse API access
2. [ ] Create sync service
3. [ ] Map job data
4. [ ] Map candidate data
5. [ ] Set up webhooks for real-time sync

---

### INT-003: Slack Notifications
**Time**: 4-6 hours

**Steps**:
1. [ ] Create Slack app
2. [ ] Add OAuth flow
3. [ ] Create notification edge function
4. [ ] Configure notification triggers
5. [ ] Add channel selection in settings

---

### FILE-001: Resume Upload
**Time**: 4-6 hours

**Steps**:
1. [ ] Set up Supabase Storage bucket
2. [ ] Create upload component
3. [ ] Add file service
4. [ ] Display resume viewer
5. [ ] Handle file versioning

---

### FILE-002: Bulk CSV Import
**Time**: 6-8 hours

**Steps**:
1. [ ] Create import dialog component
2. [ ] Add CSV parser (Papa Parse)
3. [ ] Create field mapping UI
4. [ ] Add validation/preview
5. [ ] Implement batch insert
6. [ ] Show import results

---

### FILE-003: Data Export
**Time**: 4-6 hours

**Steps**:
1. [ ] Create export utility
2. [ ] Add export button to candidate list
3. [ ] Add export button to pipeline view
4. [ ] Generate CSV/Excel files
5. [ ] Add column selection

---

### SEC-003: Two-Factor Authentication
**Time**: 4-6 hours

**Steps**:
1. [ ] Enable Supabase MFA
2. [ ] Create MFA setup UI
3. [ ] Add QR code generation
4. [ ] Handle verification flow
5. [ ] Add recovery codes

---

### SEC-004: Audit Logging
**Time**: 6-8 hours

**Steps**:
1. [ ] Create audit_logs table
2. [ ] Create database triggers
3. [ ] Log all CRUD operations
4. [ ] Create audit log viewer
5. [ ] Add filtering/search

---

### SEC-005: Role-Based Access Control
**Time**: 8-12 hours

**Steps**:
1. [ ] Define roles (Admin, Recruiter, Viewer)
2. [ ] Add role column to users
3. [ ] Create permission matrix
4. [ ] Update RLS policies
5. [ ] Add role checks in UI
6. [ ] Create role management UI

---

## 📁 File Reference

### Files with Mock Data to Replace

| File | Mock Data | Task | Est. Hours |
|------|-----------|------|------------|
| `src/components/dashboard/ActivityFeed.tsx` | Lines 5-42 | DATA-001 | 2-3h |
| `src/components/dashboard/PipelineChart.tsx` | Lines 4-11 | DATA-002 | 2-3h |
| `src/pages/Analytics.tsx` | Lines 29-52 | ANLYT-001-003 | 7-10h |
| `src/pages/CandidateProfile.tsx` | Lines 72-91 | DATA-003,004 | 2-4h |
| `src/pages/Settings.tsx` | Lines 347-365 | SET-001 | 4-6h |
| `src/pages/Integrations.tsx` | Lines 17-73 | INT-* | 36-54h |

### Files with Known Bugs

| File | Issue | Task | Est. Hours |
|------|-------|------|------------|
| `src/services/talentPoolService.ts:147` | Wrong table name | BUG-001 | 5 min |
| `src/pages/Settings.tsx` | Forms don't save | BUG-002 | 2-3h |

### Service File Status

| Service | File | Status |
|---------|------|--------|
| Candidates | `src/services/candidateService.ts` | ✅ Complete |
| Pipelines | `src/services/pipelineService.ts` | ✅ Complete |
| Talent Pools | `src/services/talentPoolService.ts` | ⚠️ Bug in update |
| Campaigns | `src/services/campaignService.ts` | ✅ Complete |
| Users | `src/services/userService.ts` | ✅ Complete |
| Communications | `src/services/communicationService.ts` | ✅ Complete |
| Email Templates | `src/services/emailTemplateService.ts` | ✅ Complete |

---

## 🗓️ Suggested Sprint Plan

### Sprint 1: Security & Stability (Day 1)
- [ ] SEC-001: RLS Policies (2-4h)
- [ ] SEC-002: Fix email sender (15m)
- [ ] CFG-002: Supabase secrets (30m)
- [ ] BUG-001: Talent pool bug (5m)
**Total: ~3-5 hours**

### Sprint 2: Core Bug Fixes (Day 1-2)
- [ ] BUG-002: Settings forms (2-3h)
- [ ] ERR-001: Error boundary (1-2h)
**Total: ~3-5 hours**

### Sprint 3: Dashboard Data (Day 2-3)
- [ ] DATA-001: Activity feed (2-3h)
- [ ] DATA-002: Pipeline chart (2-3h)
**Total: ~4-6 hours**

### Sprint 4: Candidate Profile (Day 3-4)
- [ ] DATA-003: Notes UI (1-2h)
- [ ] DATA-004: Communications UI (1-2h)
**Total: ~2-4 hours**

### Sprint 5: Analytics (Day 4-6)
- [ ] ANLYT-001: Source distribution (2-3h)
- [ ] ANLYT-002: Conversion funnel (2-3h)
- [ ] ANLYT-003: Timeline (3-4h)
- [ ] ANLYT-004: Date picker (2-3h)
- [ ] ANLYT-005: Export (3-4h)
**Total: ~12-17 hours**

### Sprint 6: Email System (Day 6-8)
- [ ] EMAIL-001: Webhooks (4-6h)
- [ ] EMAIL-002: Unsubscribe (3-4h)
- [ ] EMAIL-003: Bounces (2-3h)
**Total: ~9-13 hours**

### Sprint 7: Settings & Team (Day 8-10)
- [ ] SET-001: Team invites (4-6h)
- [ ] SET-002: Notifications (2-3h)
- [ ] SET-003: Pipeline SLA (2-3h)
**Total: ~8-12 hours**

---

## ✅ Progress Tracking

**P0 Complete**: [ ] / 3  
**P1 Complete**: [ ] / 7  
**P2 Complete**: [ ] / 10  
**P3 Complete**: [ ] / 12  

**Last Updated**: <!-- Update this date -->
