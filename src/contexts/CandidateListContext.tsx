import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CandidateListContextType {
  candidateIds: string[];
  setCandidateList: (ids: string[]) => void;
  getNextCandidateId: (currentId: string) => string | null;
  getPreviousCandidateId: (currentId: string) => string | null;
  getCurrentIndex: (currentId: string) => number;
  getTotalCount: () => number;
}

const CandidateListContext = createContext<CandidateListContextType | null>(null);

export const CandidateListProvider = ({ children }: { children: ReactNode }) => {
  const [candidateIds, setCandidateIds] = useState<string[]>([]);

  const setCandidateList = useCallback((ids: string[]) => {
    setCandidateIds(ids);
  }, []);

  const getNextCandidateId = useCallback((currentId: string): string | null => {
    const currentIndex = candidateIds.indexOf(currentId);
    if (currentIndex === -1 || currentIndex >= candidateIds.length - 1) {
      return null;
    }
    return candidateIds[currentIndex + 1];
  }, [candidateIds]);

  const getPreviousCandidateId = useCallback((currentId: string): string | null => {
    const currentIndex = candidateIds.indexOf(currentId);
    if (currentIndex <= 0) {
      return null;
    }
    return candidateIds[currentIndex - 1];
  }, [candidateIds]);

  const getCurrentIndex = useCallback((currentId: string): number => {
    return candidateIds.indexOf(currentId);
  }, [candidateIds]);

  const getTotalCount = useCallback((): number => {
    return candidateIds.length;
  }, [candidateIds]);

  return (
    <CandidateListContext.Provider
      value={{
        candidateIds,
        setCandidateList,
        getNextCandidateId,
        getPreviousCandidateId,
        getCurrentIndex,
        getTotalCount,
      }}
    >
      {children}
    </CandidateListContext.Provider>
  );
};

export const useCandidateListContext = () => {
  const context = useContext(CandidateListContext);
  if (!context) {
    throw new Error('useCandidateListContext must be used within CandidateListProvider');
  }
  return context;
};
