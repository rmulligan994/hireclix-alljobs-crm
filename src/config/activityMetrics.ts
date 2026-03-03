import { UserPlus, Users, Mail, Phone, Send } from 'lucide-react';

export type ActivityMetricKey =
  | 'newCandidatesAdded'
  | 'candidatesContacted'
  | 'emailsSent'
  | 'calls'
  | 'candidatesSubmitted';

export const ACTIVITY_METRICS: {
  key: ActivityMetricKey;
  label: string;
  icon: typeof UserPlus;
  color: string;
}[] = [
  { key: 'newCandidatesAdded', label: 'New Candidates Added', icon: UserPlus, color: 'sky-blue' },
  { key: 'candidatesContacted', label: 'Candidates Contacted', icon: Users, color: 'deep-sea' },
  { key: 'emailsSent', label: 'Emails Sent', icon: Mail, color: 'sunrise' },
  { key: 'calls', label: 'Calls', icon: Phone, color: 'sky-blue' },
  { key: 'candidatesSubmitted', label: 'Candidates Submitted', icon: Send, color: 'deep-sea' },
];
