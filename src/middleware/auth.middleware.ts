import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface JwtPayload {
  id: number;
  email: string;
  role: "JOB_SEEKER" | "EMPLOYER";
}

// Extend Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name: string;
        role: "JOB_SEEKER" | "EMPLOYER";
        phone?: string;
        location?: string;
        profilePicture?: string;
        employerId?: number; // Add employerId for employer users
        jobSeekerId?: number; // Add jobSeekerId for job seeker users
        companyId?: number; // Add companyId for employer users
      };
    }
  }
}

// General authentication middleware
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Access denied. No token provided." 
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret123"
    ) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true,
        phone: true,
        location: true,
        profilePicture: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found." 
      });
    }

    if (user.role !== decoded.role) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token: Role mismatch." 
      });
    }

    req.user = user as {
      id: number;
      email: string;
      name: string;
      role: "JOB_SEEKER" | "EMPLOYER";
      phone?: string;
      location?: string;
      profilePicture?: string;
    };
    next();

  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ 
      success: false,
      message: "Invalid token." 
    });
  }
};

// Updated Employer-specific authentication middleware
const authEmployer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Access denied. No token provided." 
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret123"
    ) as JwtPayload;

    if (decoded.role !== "EMPLOYER") {
      return res.status(403).json({ 
        success: false,
        message: "Access denied: Not an employer." 
      });
    }

    // Updated to match simplified schema structure
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true,
        phone: true,
        location: true,
        profilePicture: true,
        employer: {
          select: {
            id: true,
            companyId: true,
            jobTitle: true,
            department: true,
            role: true,
            company: {
              select: {
                id: true,
                name: true,
                industry: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found." 
      });
    }

    if (user.role !== "EMPLOYER") {
      return res.status(403).json({ 
        success: false,
        message: "Access denied: User is not an employer." 
      });
    }

    req.user = {
      ...user,
      employerId: user.employer?.id,
      companyId: user.employer?.companyId || undefined,
    } as {
      id: number;
      email: string;
      name: string;
      role: "EMPLOYER";
      phone?: string;
      location?: string;
      profilePicture?: string;
      employerId?: number;
      companyId?: number;
    };
    next();

  } catch (error) {
    console.error("Employer authentication error:", error);
    return res.status(401).json({ 
      success: false,
      message: "Invalid token." 
    });
  }
};

// Updated Job seeker-specific authentication middleware
const authJobSeeker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Access denied. No token provided." 
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret123"
    ) as JwtPayload;

    if (decoded.role !== "JOB_SEEKER") {
      return res.status(403).json({ 
        success: false,
        message: "Access denied: Not a job seeker." 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true,
        phone: true,
        location: true,
        profilePicture: true,
        jobSeeker: {
          select: {
            id: true,
            resume: true,
            linkedin: true,
            github: true,
            skills: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found." 
      });
    }

    if (user.role !== "JOB_SEEKER") {
      return res.status(403).json({ 
        success: false,
        message: "Access denied: User is not a job seeker." 
      });
    }

    req.user = {
      ...user,
      jobSeekerId: user.jobSeeker?.id,
    } as {
      id: number;
      email: string;
      name: string;
      role: "JOB_SEEKER";
      phone?: string;
      location?: string;
      profilePicture?: string;
      jobSeekerId?: number;
    };
    next();

  } catch (error) {
    console.error("Job seeker authentication error:", error);
    return res.status(401).json({ 
      success: false,
      message: "Invalid token." 
    });
  }
};

// Role-based authorization middleware factory
const checkRole = (allowedRoles: ("JOB_SEEKER" | "EMPLOYER")[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(req.user.role as "JOB_SEEKER" | "EMPLOYER")) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions."
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret123"
    ) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true,
        phone: true,
        location: true,
        profilePicture: true
      }
    });

    if (user && user.role === decoded.role) {
      req.user = user as {
        id: number;
        email: string;
        name: string;
        role: "JOB_SEEKER" | "EMPLOYER";
        phone?: string;
        location?: string;
        profilePicture?: string;
      };
    }

    next();

  } catch (error) {
    console.error("Optional authentication error:", error);
    next();
  }
};

// Updated middleware to ensure user has completed their profile
const requireCompleteProfile = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    if (req.user.role === "EMPLOYER") {
      const employer = await prisma.employer.findUnique({
        where: { userId: req.user.id }
      });

      if (!employer) {
        return res.status(400).json({
          success: false,
          message: "Please complete your employer profile first"
        });
      }
    } else if (req.user.role === "JOB_SEEKER") {
      const jobSeeker = await prisma.jobSeeker.findUnique({
        where: { userId: req.user.id }
      });

      if (!jobSeeker) {
        return res.status(400).json({
          success: false,
          message: "Please complete your job seeker profile first"
        });
      }
    }

    next();
  } catch (error) {
    console.error("Profile check error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// UPDATED: Middleware to ensure employer has company association
const requireCompany = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    if (req.user.role !== "EMPLOYER") {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only employers can access company resources"
      });
    }

    const employer = await prisma.employer.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    if (!employer) {
      return res.status(400).json({
        success: false,
        message: "Please complete your employer profile first"
      });
    }

    // Check if employer has company association
    if (!employer.companyId || !employer.company) {
      return res.status(400).json({
        success: false,
        message: "Please select or create a company profile first",
        action: "company_required"
      });
    }

    // Check if company is active
    if (!employer.company.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your company profile is inactive"
      });
    }

    next();
  } catch (error) {
    console.error("Company check error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// REMOVED: checkCompanyOwnership and checkJobOwnership 
// (simplified - if employer has companyId, they can access)

// NEW: Middleware to check if employer owns a specific job
const checkJobOwnership = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "EMPLOYER") {
    return res.status(403).json({
      success: false,
      message: "Access denied: Only employers can access job resources"
    });
  }

  try {
    const jobId = parseInt(req.params.jobId || req.params.id);
    
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required"
      });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        employerId: req.user.employerId
      },
      select: { id: true }
    });

    if (!job) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You don't own this job or job not found"
      });
    }

    next();
  } catch (error) {
    console.error("Job ownership check error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export { 
  authenticate, 
  authEmployer, 
  authJobSeeker, 
  checkRole, 
  optionalAuth,
  requireCompleteProfile,
  requireCompany,
  checkJobOwnership
};
