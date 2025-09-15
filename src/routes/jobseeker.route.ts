import express from "express";
import {
  authJobSeeker,
  authenticate,
  requireCompleteProfile
} from "../middleware/auth.middleware.js";
import {
  updateUserBasicDetails,
  createJobSeekerProfile,
  updateJobSeekerProfile,
  getJobSeekerProfile,
  addEducation,
  updateEducation,
  deleteEducation,
  addExperience,
  updateExperience,
  deleteExperience,
  addProject,
  updateProject,
  deleteProject,
  updatePreferences,
  getPreferences,
  checkProfileStatus,
  getAllCompanies
} from "../controller/jobseeker.controller.js";

const router = express.Router();

// Basic user details (accessible after authentication)
router.put("/basic-details", authJobSeeker, updateUserBasicDetails);
router.get("/profile-status", authenticate, checkProfileStatus);

// Job seeker profile management
router.post("/profile", authJobSeeker, createJobSeekerProfile);
router.put("/profile", authJobSeeker, requireCompleteProfile, updateJobSeekerProfile);
router.get("/profile", authJobSeeker, getJobSeekerProfile);

// Education management
router.post("/education", authJobSeeker, requireCompleteProfile, addEducation);
router.put("/education/:educationId", authJobSeeker, requireCompleteProfile, updateEducation);
router.delete("/education/:educationId", authJobSeeker, requireCompleteProfile, deleteEducation);

// Experience management
router.post("/experience", authJobSeeker, requireCompleteProfile, addExperience);
router.put("/experience/:experienceId", authJobSeeker, requireCompleteProfile, updateExperience);
router.delete("/experience/:experienceId", authJobSeeker, requireCompleteProfile, deleteExperience);

// Project management
router.post("/project", authJobSeeker, requireCompleteProfile, addProject);
router.put("/project/:projectId", authJobSeeker, requireCompleteProfile, updateProject);
router.delete("/project/:projectId", authJobSeeker, requireCompleteProfile, deleteProject);

// Preferences management
router.put("/preferences", authJobSeeker, requireCompleteProfile, updatePreferences);
router.get("/preferences", authJobSeeker, requireCompleteProfile, getPreferences);

// Public routes
router.get("/public/:id", getJobSeekerProfile);

router.get('/companies',authJobSeeker,requireCompleteProfile,getAllCompanies);

export default router;
