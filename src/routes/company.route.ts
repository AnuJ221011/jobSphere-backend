import express from "express";
import { 
  searchCompanies,
  selectExistingCompany,
  createCompany,
  getMyCompany,
  updateMyCompany,
  getCompanyPublic
} from "../controller/company.controller.js";
import { 
  authEmployer,
  requireCompany 
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
// Search companies (no auth needed for search)
router.get("/search", searchCompanies);

// Get public company profile
router.get("/public/:id", getCompanyPublic);

// Employer routes
// Get my current company
router.get("/my-company", authEmployer, getMyCompany);

// Select existing company (updates employer's companyId)
router.post("/:companyId/select", authEmployer, selectExistingCompany);

// Create new company profile
router.post("/", authEmployer, createCompany);

// Update my company profile (requires company association)
router.put("/", authEmployer, requireCompany, updateMyCompany);

export default router;
