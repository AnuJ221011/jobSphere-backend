import { Router } from 'express';
import { ApplicationHistoryController } from '../controller/applicationHistory.controller.js';
import { 
  authJobSeeker, 
  requireCompleteProfile 
} from '../middleware/auth.middleware.js';

const router = Router();

// Apply job seeker authentication and complete profile requirement to all routes
router.use(authJobSeeker);
router.use(requireCompleteProfile);

// Get current user's application history (simplified endpoint - most commonly used)
// GET /api/applications/my-history
// Query params: ?status=PENDING&page=1&limit=10
router.get('/my-history', ApplicationHistoryController.getMyApplicationHistory);

// Get current user's application statistics
// GET /api/applications/my-stats
router.get('/my-stats', ApplicationHistoryController.getMyApplicationStats);

// Get current user's applications by status
// GET /api/applications/my-applications/status/:status
router.get('/my-applications/status/:status', ApplicationHistoryController.getMyApplicationsByStatus);

// Get current user's applications within date range
// GET /api/applications/my-applications/date-range
// Query params: ?startDate=2024-01-01&endDate=2024-12-31
router.get('/my-applications/date-range', ApplicationHistoryController.getMyApplicationsByDateRange);

// Get specific application details (belongs to current user)
// GET /api/applications/details/:applicationId
router.get('/details/:applicationId', ApplicationHistoryController.getApplicationDetails);

// Withdraw application (job seeker action)
// PUT /api/applications/:applicationId/withdraw
router.put('/:applicationId/withdraw', ApplicationHistoryController.withdrawApplication);

// Legacy endpoint - Get application history by jobSeekerId (with authorization check)
// GET /api/applications/history/:jobSeekerId
// This endpoint includes additional authorization to ensure users can only access their own data
router.get('/history/:jobSeekerId', ApplicationHistoryController.getApplicationHistory);

export default router;
