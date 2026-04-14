import { Suspense } from 'react';
import TalentPool from '@/views/TalentPool';

export default function TalentPage() {
  return (
    <Suspense fallback={null}>
      <TalentPool />
    </Suspense>
  );
}
