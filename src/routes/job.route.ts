import express from 'express';
import {
  createJob,
  updateJobDetails,
  updateJobStatus,
  deleteJob,
  getJobsByEmployer,
  getJobById,
  getAllJobs,
  createJobForm,
  updateJobForm,
  getJobForm,
  deleteJobFormField,
  getJobApplications,
  updateApplicationStatus
} from '../controller/job.controller.js';
import {
  authEmployer,
  requireCompany,
  checkJobOwnership,
  optionalAuth,
  authenticate
} from '../middleware/auth.middleware.js';

const router = express.Router();

// Job CRUD Operations
router.post('/create', authEmployer, requireCompany, createJob);
router.put('/:jobId', authEmployer, checkJobOwnership, updateJobDetails);
router.patch('/:jobId/status', authEmployer, checkJobOwnership, updateJobStatus);
router.delete('/:jobId', authEmployer, checkJobOwnership, deleteJob);

// Job Retrieval
router.get('/employer', authEmployer, getJobsByEmployer);
router.get('/:jobId', optionalAuth, getJobById);
router.get('/', optionalAuth, getAllJobs);

// Job Form Management
router.post('/:jobId/form', authEmployer, checkJobOwnership, createJobForm);
router.put('/:jobId/form', authEmployer, checkJobOwnership, updateJobForm);
router.get('/:jobId/form', getJobForm);
router.delete('/:jobId/form/field/:fieldId', authEmployer, checkJobOwnership, deleteJobFormField);

// Application Management
router.get('/:jobId/applications', authEmployer, checkJobOwnership, getJobApplications);
router.patch('/:jobId/applications/:applicationId/status', authEmployer, checkJobOwnership, updateApplicationStatus);

export default router;
