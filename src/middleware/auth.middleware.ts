import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { PrismaClient, Admin, Student } from "@prisma/client";

const prisma = new PrismaClient();

interface JwtPayload {
  emailId: string;
  role: "ADMIN" | "STUDENT";
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: "ADMIN" | "STUDENT";
      };
    }
  }
}


const authAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized access." });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret123"
    ) as JwtPayload;

    if (decoded.role.toUpperCase() !== "ADMIN") {
      return res.status(403).json({ message: "Access denied: Not an admin." });
    }

    const user = await prisma.admin.findUnique({
      where: { email: decoded.emailId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    req.user = {
      ...user,
      role: "ADMIN",
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Invalid token." });
  }
};


const authStudent = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized access." });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret123"
    ) as JwtPayload;

    if (decoded.role.toUpperCase() !== "STUDENT") {
      return res.status(403).json({ message: "Access denied: Not an student" });
    }

    const user = await prisma.student.findUnique({
      where: { email: decoded.emailId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    req.user = {
      ...user,
      role: "STUDENT",
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Invalid token." });
  }
};


export { authAdmin, authStudent };
