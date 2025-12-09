// Mock candidates data store for duplicate detection
export interface MockCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  location: string;
  source: string;
  tags: string[];
  notes: string;
  createdAt: string;
}

export const mockCandidatesData: MockCandidate[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1 (555) 123-4567',
    company: 'Tech Corp',
    jobTitle: 'Senior Frontend Developer',
    location: 'San Francisco, CA',
    source: 'LinkedIn',
    tags: ['React', 'TypeScript', 'Node.js'],
    notes: 'Strong candidate with 7 years experience',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@innovationlabs.com',
    phone: '+1 (555) 234-5678',
    company: 'Innovation Labs',
    jobTitle: 'Product Manager',
    location: 'New York, NY',
    source: 'Referral',
    tags: ['Agile', 'Product Strategy', 'Analytics'],
    notes: 'Referred by John Smith',
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    firstName: 'David',
    lastName: 'Chen',
    email: 'david.chen@aisolutions.io',
    phone: '+1 (555) 345-6789',
    company: 'AI Solutions',
    jobTitle: 'Data Scientist',
    location: 'Austin, TX',
    source: 'Job Board',
    tags: ['Python', 'ML', 'Statistics'],
    notes: 'PhD in Machine Learning',
    createdAt: '2024-01-20',
  },
  {
    id: '4',
    firstName: 'Emily',
    lastName: 'Wilson',
    email: 'emily.wilson@startup.co',
    phone: '+1 (555) 456-7890',
    company: 'Startup Co',
    jobTitle: 'Full Stack Engineer',
    location: 'Seattle, WA',
    source: 'Cold Outreach',
    tags: ['React', 'Python', 'AWS'],
    notes: '',
    createdAt: '2024-02-10',
  },
];

// Helper to get candidates in a format compatible with talent pool/pipeline dialogs
export const mockCandidates = mockCandidatesData.map(c => ({
  id: c.id,
  name: `${c.firstName} ${c.lastName}`,
  title: c.jobTitle,
  company: c.company,
  skills: c.tags,
  email: c.email,
  phone: c.phone,
  location: c.location,
}));

export function findDuplicateCandidate(email?: string, phone?: string): MockCandidate | null {
  if (!email && !phone) return null;
  
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhone = phone?.replace(/[^0-9+]/g, '');
  
  return mockCandidatesData.find(candidate => {
    if (normalizedEmail && candidate.email.toLowerCase() === normalizedEmail) {
      return true;
    }
    if (normalizedPhone && normalizedPhone.length > 6) {
      const candidatePhone = candidate.phone.replace(/[^0-9+]/g, '');
      if (candidatePhone === normalizedPhone) {
        return true;
      }
    }
    return false;
  }) || null;
}

export function findAllDuplicates(): { candidate: MockCandidate; duplicates: MockCandidate[]; matchType: 'email' | 'phone' }[] {
  const results: { candidate: MockCandidate; duplicates: MockCandidate[]; matchType: 'email' | 'phone' }[] = [];
  const checked = new Set<string>();

  for (let i = 0; i < mockCandidatesData.length; i++) {
    const candidate = mockCandidatesData[i];
    if (checked.has(candidate.id)) continue;

    for (let j = i + 1; j < mockCandidatesData.length; j++) {
      const other = mockCandidatesData[j];
      if (checked.has(other.id)) continue;

      if (candidate.email && other.email && candidate.email.toLowerCase() === other.email.toLowerCase()) {
        results.push({ candidate, duplicates: [other], matchType: 'email' });
        checked.add(candidate.id);
        checked.add(other.id);
      } else if (candidate.phone && other.phone) {
        const phone1 = candidate.phone.replace(/[^0-9+]/g, '');
        const phone2 = other.phone.replace(/[^0-9+]/g, '');
        if (phone1 === phone2 && phone1.length > 6) {
          results.push({ candidate, duplicates: [other], matchType: 'phone' });
          checked.add(candidate.id);
          checked.add(other.id);
        }
      }
    }
  }

  return results;
}

export function getDuplicateMatchType(existing: MockCandidate, email?: string, phone?: string): 'email' | 'phone' | null {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhone = phone?.replace(/[^0-9+]/g, '');
  
  if (normalizedEmail && existing.email.toLowerCase() === normalizedEmail) {
    return 'email';
  }
  if (normalizedPhone && normalizedPhone.length > 6) {
    const existingPhone = existing.phone.replace(/[^0-9+]/g, '');
    if (existingPhone === normalizedPhone) {
      return 'phone';
    }
  }
  return null;
}
