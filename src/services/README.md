# Service Layer

This directory contains the service layer that acts as the **ONLY** interface between the frontend and the backend. Frontend components should never directly call the database or backend APIs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Components                      │
│                  (React, hooks, pages)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│         (candidateService, pipelineService, etc.)           │
│                                                              │
│  • Clear interfaces with TypeScript types                    │
│  • All database/API calls encapsulated here                 │
│  • Easy to swap backend implementations                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Provider                          │
│              (Lovable Cloud / Supabase / etc.)              │
└─────────────────────────────────────────────────────────────┘
```

## Available Services

### `candidateService`
Handles all candidate CRUD operations:
- `getAll()` - Get all candidates
- `getById(id)` - Get a single candidate
- `getByIdWithAssociations(id)` - Get candidate with pipeline/pool associations
- `create(data)` - Create a new candidate
- `update(id, data)` - Update a candidate
- `delete(id)` - Delete a candidate
- `search(query)` - Search candidates
- `findDuplicates(email, phone)` - Find potential duplicates
- `getCount()` - Get total count
- `getNewThisWeek()` - Get count of new candidates this week

### `pipelineService`
Handles all pipeline operations:
- `getAll()` - Get all pipelines
- `getActive()` - Get active pipelines only
- `getArchived()` - Get archived pipelines only
- `getById(id)` - Get a single pipeline
- `getByIdWithCandidates(id)` - Get pipeline with candidate info
- `create(data)` - Create a new pipeline
- `update(id, data)` - Update a pipeline
- `archive(id)` - Archive a pipeline
- `unarchive(id)` - Unarchive a pipeline
- `delete(id)` - Delete a pipeline
- `addCandidate(pipelineId, candidateId, stage)` - Add candidate to pipeline
- `removeCandidate(pipelineId, candidateId)` - Remove candidate from pipeline
- `updateCandidateStage(pipelineId, candidateId, stage)` - Update candidate stage
- `getCandidates(pipelineId)` - Get candidates in a pipeline
- `getActiveCount()` - Get count of active pipelines

### `talentPoolService`
Handles all talent pool operations:
- `getAll()` - Get all talent pools
- `getAllWithCounts()` - Get all pools with candidate counts
- `getById(id)` - Get a single talent pool
- `getByIdWithCandidates(id)` - Get pool with candidate info
- `create(data)` - Create a new talent pool
- `update(id, data)` - Update a talent pool
- `delete(id)` - Delete a talent pool
- `addCandidate(poolId, candidateId)` - Add candidate to pool
- `addCandidates(poolId, candidateIds)` - Add multiple candidates
- `removeCandidate(poolId, candidateId)` - Remove candidate from pool
- `removeCandidates(poolId, candidateIds)` - Remove multiple candidates
- `getCandidates(poolId)` - Get candidates in a pool
- `getCount()` - Get total count

### `userService`
Handles authentication and user management:
- `signUp(data)` - Register a new user
- `signIn(data)` - Sign in a user
- `signOut()` - Sign out the current user
- `getCurrentUser()` - Get the current authenticated user
- `getSession()` - Get the current session
- `getProfile(userId)` - Get user profile
- `updateProfile(userId, data)` - Update user profile
- `onAuthStateChange(callback)` - Subscribe to auth state changes
- `resetPassword(email)` - Send password reset email
- `updatePassword(newPassword)` - Update user password

### `communicationService`
Handles notes and communication history:
- `getByCandidate(candidateId)` - Get communications for a candidate
- `createCommunication(data)` - Create a new communication
- `updateCommunication(id, data)` - Update a communication
- `deleteCommunication(id)` - Delete a communication
- `getNotesByCandidate(candidateId)` - Get notes for a candidate
- `createNote(data)` - Create a new note
- `updateNote(id, data)` - Update a note
- `deleteNote(id)` - Delete a note
- `getRecentActivity(candidateId, limit)` - Get combined recent activity

## How to Swap Backends

### Current Implementation: Lovable Cloud (Supabase)

The current implementation uses Lovable Cloud (powered by Supabase) as the backend.

### Swapping to a Different Backend

1. **Keep the same function signatures** - The interfaces must remain identical
2. **Update the implementation** - Change the database calls inside each service
3. **Update configuration** - Modify `/src/config/backend.config.ts`

### Example: Swapping to Firebase

```typescript
// candidateService.ts
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

export const candidateService = {
  getAll: async (): Promise<Candidate[]> => {
    const querySnapshot = await getDocs(collection(db, 'candidates'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Candidate[];
  },
  
  getById: async (id: string): Promise<Candidate | null> => {
    const docSnap = await getDoc(doc(db, 'candidates', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Candidate;
  },
  
  // ... implement other methods
};
```

### Example: Swapping to a Custom REST API

```typescript
// candidateService.ts
import { backendConfig } from '@/config/backend.config';

const API_URL = backendConfig.apiUrl;

export const candidateService = {
  getAll: async (): Promise<Candidate[]> => {
    const response = await fetch(`${API_URL}/candidates`);
    if (!response.ok) throw new Error('Failed to fetch candidates');
    return response.json();
  },
  
  getById: async (id: string): Promise<Candidate | null> => {
    const response = await fetch(`${API_URL}/candidates/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch candidate');
    return response.json();
  },
  
  // ... implement other methods
};
```

## Required Environment Variables

### Lovable Cloud (Current)
- `VITE_SUPABASE_URL` - Supabase project URL (auto-configured)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (auto-configured)

### Firebase (if swapping)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`

### Custom API (if swapping)
- `VITE_API_URL`
- `VITE_API_KEY` (if required)

## Database Schema

### `candidates`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| email | TEXT | Email address |
| phone | TEXT | Phone number |
| company | TEXT | Current company |
| title | TEXT | Job title |
| location | TEXT | Location |
| source | TEXT | Candidate source |
| tags | TEXT[] | Skills/tags array |
| linkedin_url | TEXT | LinkedIn profile |
| avatar_url | TEXT | Profile picture |
| created_at | TIMESTAMP | Creation date |
| updated_at | TIMESTAMP | Last update |
| created_by | UUID | Creator user ID |

### `pipelines`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Pipeline name |
| description | TEXT | Description |
| status | TEXT | 'active' or 'archived' |
| stages | JSONB | Array of stage objects |
| created_at | TIMESTAMP | Creation date |
| updated_at | TIMESTAMP | Last update |
| created_by | UUID | Creator user ID |

### `talent_pools`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Pool name |
| description | TEXT | Description |
| created_at | TIMESTAMP | Creation date |
| updated_at | TIMESTAMP | Last update |
| created_by | UUID | Creator user ID |

### `pipeline_candidates` (junction table)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| pipeline_id | UUID | FK to pipelines |
| candidate_id | UUID | FK to candidates |
| stage | TEXT | Current stage |
| added_at | TIMESTAMP | When added |
| updated_at | TIMESTAMP | Last update |

### `talent_pool_candidates` (junction table)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| talent_pool_id | UUID | FK to talent_pools |
| candidate_id | UUID | FK to candidates |
| added_at | TIMESTAMP | When added |

### `notes`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| candidate_id | UUID | FK to candidates |
| content | TEXT | Note content |
| created_at | TIMESTAMP | Creation date |
| updated_at | TIMESTAMP | Last update |
| created_by | UUID | Creator user ID |

### `communications`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| candidate_id | UUID | FK to candidates |
| type | TEXT | 'email', 'call', 'meeting', 'message' |
| subject | TEXT | Subject line |
| content | TEXT | Content |
| direction | TEXT | 'inbound' or 'outbound' |
| occurred_at | TIMESTAMP | When it happened |
| created_at | TIMESTAMP | Creation date |
| created_by | UUID | Creator user ID |

### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| email | TEXT | Email |
| avatar_url | TEXT | Profile picture |
| created_at | TIMESTAMP | Creation date |
| updated_at | TIMESTAMP | Last update |
