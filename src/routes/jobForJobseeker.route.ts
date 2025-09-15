import { Router } from 'express';
import { JobSeekerController } from '../controller/jobForJobseeker.controller.js';
import { 
  authJobSeeker, 
  optionalAuth, 
  requireCompleteProfile 
} from '../middleware/auth.middleware.js';

const router = Router();

// Public routes (no authentication required but with optional auth to show applied status)
router.get('/jobs', optionalAuth, JobSeekerController.getAllJobs);
router.get('/jobs/:jobId', optionalAuth, JobSeekerController.getJobById);

// Protected routes (job seeker authentication required)
router.use(authJobSeeker); // Apply job seeker auth middleware to all routes below

// Routes that require job seeker profile to be complete
router.use(requireCompleteProfile); // Ensure job seeker profile exists

// Job application routes
router.post('/jobs/:jobId/apply', JobSeekerController.applyForJob);
router.get('/applications', JobSeekerController.getMyApplications);
router.get('/applications/:applicationId', JobSeekerController.getApplicationById);
router.patch('/applications/:applicationId/withdraw', JobSeekerController.withdrawApplication);

// Recommendation and personalized features
router.get('/recommendations', JobSeekerController.getRecommendedJobs);
router.get('/saved-jobs', JobSeekerController.getSavedJobs); // Placeholder for future feature

// Dashboard statistics
router.get('/stats', JobSeekerController.getJobStats);

export default router;
