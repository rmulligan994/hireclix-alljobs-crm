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
export { pipelineService } from './pipelineService';
export { talentPoolService } from './talentPoolService';
export { userService } from './userService';
export { communicationService } from './communicationService';

// Re-export types for convenience
export * from '@/types';
