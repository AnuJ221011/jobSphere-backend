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
      };
    }
  }
}

// General authentication middleware
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for token in Authorization header first, then cookies
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

    // Find user in database
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

    // Verify role matches token
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

// Employer-specific authentication middleware
const authEmployer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for token in Authorization header first, then cookies
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

    // Find user and include employer profile
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
            companyName: true,
            companyUrl: true,
            companySize: true,
            industry: true
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

    req.user = user as {
      id: number;
      email: string;
      name: string;
      role: "EMPLOYER";
      phone?: string;
      location?: string;
      profilePicture?: string;
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

// Job seeker-specific authentication middleware
const authJobSeeker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for token in Authorization header first, then cookies
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

    // Find user and include job seeker profile
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

    req.user = user as {
      id: number;
      email: string;
      name: string;
      role: "JOB_SEEKER";
      phone?: string;
      location?: string;
      profilePicture?: string;
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
    // Check for token in Authorization header first, then cookies
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      token = req.cookies.token;
    }

    if (!token) {
      // No token provided, continue without user
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret123"
    ) as JwtPayload;

    // Find user in database
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
    // Invalid token, but continue without user
    console.error("Optional authentication error:", error);
    next();
  }
};

// Middleware to ensure user has completed their profile
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

export { 
  authenticate, 
  authEmployer, 
  authJobSeeker, 
  checkRole, 
  optionalAuth,
  requireCompleteProfile 
};
