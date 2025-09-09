import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authEmployer, authJobSeeker } from "./auth.middleware.js";

interface JwtPayload {
  id: number;
  email: string;
  role: "EMPLOYER" | "JOB_SEEKER";
}

export const authDynamic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Support both Authorization header & cookies
    let token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized access. No token provided." 
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret123"
    ) as JwtPayload;

    // Dispatch to specific middleware based on role
    if (decoded.role === "EMPLOYER") {
      return authEmployer(req, res, next);
    } else if (decoded.role === "JOB_SEEKER") {
      return authJobSeeker(req, res, next);
    } else {
      return res.status(403).json({ 
        success: false,
        message: "Access denied. Invalid role." 
      });
    }
  } catch (error) {
    console.error("Dynamic auth error:", error);
    return res.status(401).json({ 
      success: false,
      message: "Invalid or expired token." 
    });
  }
};
