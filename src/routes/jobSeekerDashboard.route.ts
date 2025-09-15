// routes/jobSeekerDashboardRoutes.ts
import express from 'express';
import { getDashboardData } from '../controller/jobSeekerDashboard.controller.js';
import { authJobSeeker } from '../middleware/auth.middleware.js';

const router = express.Router();

// Single endpoint for all dashboard data
router.get('/', authJobSeeker, getDashboardData);

export default router;
