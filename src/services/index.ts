/**
 * Service Layer
 * 
 * This module exports all services that act as the interface between
 * the frontend and the backend. Frontend components should ONLY import
 * from this services layer - never directly access the database.
 * 
 * To swap backends:
 * 1. Update the implementation in each service file
 * 2. Keep the same function signatures
 * 3. Frontend code remains unchanged
 */

export { candidateService } from './candidateService';
export { searchGlobalSuggestions, SUGGESTION_MIN_CHARS, type GlobalSearchResults } from './globalSearchService';
export { resumeService } from './resumeService';
export { pipelineService } from './pipelineService';
export {
  getSourceStats,
  getConversionFunnel,
  getHiringTimeline,
  type DateRange,
  type SourceStat,
  type ConversionStage,
  type TimelinePoint,
} from './analyticsService';
export { talentPoolService } from './talentPoolService';
export { userService } from './userService';
export { communicationService } from './communicationService';
export {
  getMyActivityStats,
  getMyActivityTimeSeries,
  type MyActivityStats,
  type ActivityMetricKey,
  type ActivityTimeSeriesPoint,
} from './activityService';

// Re-export types for convenience
export * from '@/types';
