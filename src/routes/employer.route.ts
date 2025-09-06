import { Router } from "express";
import {
  createEmployer,
  getEmployer,
  updateEmployer,
  deleteEmployer,
  getEmployerJobs,
  createJob,
  updateJob,
  deleteJob,
  getJobApplications,
  updateApplicationStatus,
  getEmployerStats,
} from "../controller/employer.controller.js";

import { 
  authEmployer, 
  requireCompleteProfile 
} from "../middleware/auth.middleware.js";

const router = Router();


router.use(authEmployer, requireCompleteProfile);

// ---------------- Employer profile routes ----------------
router.post("/", createEmployer);          // Create employer profile
router.get("/:id", getEmployer);           // Get employer by id
router.put("/:id", updateEmployer);        // Update employer profile
router.delete("/:id", deleteEmployer);     // Delete employer profile

// ---------------- Employer statistics ----------------
router.get("/:id/stats", getEmployerStats);

// ---------------- Job management routes ----------------
router.get("/:id/jobs", getEmployerJobs);                       // Get all jobs for employer
router.post("/:id/jobs", createJob);                            // Create a job
router.put("/:employerId/jobs/:jobId", updateJob);              // Update a job
router.delete("/:employerId/jobs/:jobId", deleteJob);           // Delete a job

// ---------------- Application management routes ----------------
router.get("/:employerId/jobs/:jobId/applications", getJobApplications);  // See applicants
router.patch("/:employerId/applications/:applicationId/status", updateApplicationStatus); // Update application status

export default router;
