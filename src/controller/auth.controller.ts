
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret123";

interface User{
    id: number;
    name: string;
    email: string;
    role: "EMPLOYER" | "JOB_SEEKER";
    password?: string;
}

// ------------------- SIGNUP -------------------
const handleSignup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const roleUpperCase = role.toUpperCase() as "EMPLOYER" | "JOB_SEEKER";

    if (!["EMPLOYER", "JOB_SEEKER"].includes(roleUpperCase)) {
      return res.status(400).json({ message: "Invalid role. Must be EMPLOYER or JOB_SEEKER." });
    }

    // Create user with related profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create the main user
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: roleUpperCase,
         
        },
      });

      

      return newUser;
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "Signup successful",
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Email already exists." });
    }
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ------------------- LOGIN -------------------
const handleLogin = async (req: Request, res: Response) => {
    console.log("Login request body:", req.body);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Find user and include their role-specific profile
    const user = await prisma.user.findUnique({
      where: { email }
      
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Note: You'll need to add a password field to your User model
    // For now, this assumes password is stored in the User table
    // If you're storing passwords elsewhere, adjust accordingly
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password." });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        profilePicture: user.profilePicture,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ------------------- LOGOUT -------------------
const handleLogout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ------------------- CHECK AUTH -------------------
const checkUserAuthentication = async (req: Request, res: Response) => {
  try {
    const user :User = req.user as User;
    console.log("User in request:", user);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: user not found in request" });
    }

    const { id, name, email, role } = user;

    res.status(200).json({
      success: true,
      user: { id, name, email, role },
      message: "User is authenticated",
    });
  } catch (error) {
    console.error("Authentication check failed:", error);
    res.status(500).json({ error: "Failed to verify authentication" });
  }
};

export { handleSignup, handleLogin, handleLogout, checkUserAuthentication };