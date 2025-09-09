import express from "express";
import { 
  updateUserBasicDetails,
  createEmployerProfile, 
  getEmployerProfile, 
  updateEmployerProfile, 
  deleteEmployerAccount,
  getEmployerStats,
  updateEmployerSettings,
  checkProfileStatus
} from "../controller/employer.controller.js";
import { 
  authEmployer, 
  authenticate,
  requireCompany
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Profile Setup Steps
router.get("/profile-status", authenticate, checkProfileStatus);
router.put("/basic-details", authenticate, updateUserBasicDetails); // Step 1
router.post("/profile", authenticate, createEmployerProfile);        // Step 2

// Profile Management
router.get("/profile", authEmployer, getEmployerProfile);
router.put("/profile", authEmployer, updateEmployerProfile);
router.delete("/account", authEmployer, deleteEmployerAccount);

// Dashboard & Statistics
router.get("/stats", authEmployer, requireCompany, getEmployerStats);

// Settings
router.put("/settings", authEmployer, updateEmployerSettings);

export default router;
