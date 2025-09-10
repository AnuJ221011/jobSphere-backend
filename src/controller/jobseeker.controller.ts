import { Request, Response } from "express";
import { PrismaClient, JobRole, JobType } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Validation schemas
const updateUserBasicDetailsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
  phone: z.string().min(10, "Phone must be at least 10 characters").max(15, "Phone must be less than 15 characters"),
  location: z.string().min(2, "Location must be at least 2 characters").max(100, "Location must be less than 100 characters"),
  profilePicture: z.string().url("Invalid profile picture URL").optional().or(z.literal(""))
});

const createJobSeekerProfileSchema = z.object({
  resume: z.string().url("Invalid resume URL").optional(),
  linkedin: z.string().url("Invalid LinkedIn URL").optional(),
  github: z.string().url("Invalid GitHub URL").optional(),
  skills: z.array(z.string().min(1, "Skill cannot be empty")).min(1, "At least one skill is required")
});

const updateJobSeekerProfileSchema = z.object({
  resume: z.string().url("Invalid resume URL").optional(),
  linkedin: z.string().url("Invalid LinkedIn URL").optional(),
  github: z.string().url("Invalid GitHub URL").optional(),
  skills: z.array(z.string().min(1, "Skill cannot be empty")).optional()
});

const educationSchema = z.object({
  institution: z.string().min(2, "Institution name must be at least 2 characters"),
  degree: z.string().min(2, "Degree must be at least 2 characters"),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  grade: z.string().optional(),
  description: z.string().optional()
});

const experienceSchema = z.object({
  company: z.string().min(2, "Company name must be at least 2 characters"),
  position: z.string().min(2, "Position must be at least 2 characters"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
  location: z.string().optional()
});

const projectSchema = z.object({
  title: z.string().min(2, "Project title must be at least 2 characters"),
  description: z.string().optional(),
  technologies: z.array(z.string().min(1, "Technology cannot be empty")).min(1, "At least one technology is required"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  githubUrl: z.string().url("Invalid GitHub URL").optional(),
  liveUrl: z.string().url("Invalid live URL").optional(),
  isActive: z.boolean().default(false)
});

const preferencesSchema = z.object({
  preferredRoles: z.array(z.nativeEnum(JobRole)).min(1, "At least one preferred role is required"),
  preferredJobTypes: z.array(z.nativeEnum(JobType)).min(1, "At least one job type is required"),
  preferredLocations: z.array(z.string().min(1, "Location cannot be empty")).min(1, "At least one location is required"),
  salaryExpectationMin: z.number().positive("Minimum salary must be positive").optional(),
  salaryExpectationMax: z.number().positive("Maximum salary must be positive").optional(),
  remoteWork: z.boolean().default(false),
  willingToRelocate: z.boolean().default(false)
}).refine((data) => {
  if (data.salaryExpectationMin && data.salaryExpectationMax) {
    return data.salaryExpectationMax >= data.salaryExpectationMin;
  }
  return true;
}, {
  message: "Maximum salary must be greater than or equal to minimum salary",
  path: ["salaryExpectationMax"]
});

// Controllers

export const updateUserBasicDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    if (req.user.role !== "JOB_SEEKER") {
      res.status(403).json({
        success: false,
        message: "Access denied: Only users with JOB_SEEKER role can update profile"
      });
      return;
    }

    const validation = updateUserBasicDetailsSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const { name, phone, location, profilePicture } = validation.data;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        phone,
        location,
        profilePicture: profilePicture || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        profilePicture: true,
        role: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Basic details updated successfully. Next step: Complete your job seeker profile.",
      data: updatedUser,
      nextStep: "job_seeker_profile"
    });

  } catch (error) {
    console.error("Update user basic details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const createJobSeekerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const validation = createJobSeekerProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const { resume, linkedin, github, skills } = validation.data;

    // Check if profile already exists
    const existingProfile = await prisma.jobSeeker.findUnique({
      where: { userId: req.user.id }
    });

    if (existingProfile) {
      res.status(400).json({
        success: false,
        message: "Job seeker profile already exists. Use update endpoint instead."
      });
      return;
    }

    const jobSeekerProfile = await prisma.jobSeeker.create({
      data: {
        userId: req.user.id,
        resume,
        linkedin,
        github,
        skills
      },
      select: {
        id: true,
        resume: true,
        linkedin: true,
        github: true,
        skills: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            location: true,
            profilePicture: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: "Job seeker profile created successfully. Next step: Add your education details.",
      data: jobSeekerProfile,
      nextStep: "education"
    });

  } catch (error) {
    console.error("Create job seeker profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const updateJobSeekerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const validation = updateJobSeekerProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const updateData = validation.data;

    const updatedProfile = await prisma.jobSeeker.update({
      where: { userId: req.user.id },
      data: updateData,
      select: {
        id: true,
        resume: true,
        linkedin: true,
        github: true,
        skills: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            location: true,
            profilePicture: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: "Job seeker profile updated successfully",
      data: updatedProfile
    });

  } catch (error) {
    console.error("Update job seeker profile error:", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      res.status(404).json({
        success: false,
        message: "Job seeker profile not found. Please create a profile first."
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

export const getJobSeekerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const profile = await prisma.jobSeeker.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        resume: true,
        linkedin: true,
        github: true,
        skills: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            location: true,
            profilePicture: true
          }
        },
        education: {
          orderBy: { startDate: 'desc' }
        },
        experience: {
          orderBy: { startDate: 'desc' }
        },
        projects: {
          orderBy: { startDate: 'desc' }
        },
        preferences: true
      }
    });

    if (!profile) {
      res.status(404).json({
        success: false,
        message: "Job seeker profile not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Job seeker profile retrieved successfully",
      data: profile
    });

  } catch (error) {
    console.error("Get job seeker profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Education Controllers
export const addEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const validation = educationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const educationData = validation.data;
    
    const education = await prisma.education.create({
      data: {
        ...educationData,
        startDate: educationData.startDate ? new Date(educationData.startDate) : null,
        endDate: educationData.endDate ? new Date(educationData.endDate) : null,
        seekerId: req.user.jobSeekerId!
      }
    });

    res.status(201).json({
      success: true,
      message: "Education added successfully",
      data: education
    });

  } catch (error) {
    console.error("Add education error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const updateEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const educationId = parseInt(req.params.educationId);
    if (!educationId) {
      res.status(400).json({
        success: false,
        message: "Education ID is required"
      });
      return;
    }

    const validation = educationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const educationData = validation.data;
    
    const updatedEducation = await prisma.education.update({
      where: {
        id: educationId,
        seekerId: req.user.jobSeekerId!
      },
      data: {
        ...educationData,
        startDate: educationData.startDate ? new Date(educationData.startDate) : null,
        endDate: educationData.endDate ? new Date(educationData.endDate) : null
      }
    });

    res.status(200).json({
      success: true,
      message: "Education updated successfully",
      data: updatedEducation
    });

  } catch (error) {
    console.error("Update education error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const deleteEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const educationId = parseInt(req.params.educationId);
    if (!educationId) {
      res.status(400).json({
        success: false,
        message: "Education ID is required"
      });
      return;
    }

    await prisma.education.delete({
      where: {
        id: educationId,
        seekerId: req.user.jobSeekerId!
      }
    });

    res.status(200).json({
      success: true,
      message: "Education deleted successfully"
    });

  } catch (error) {
    console.error("Delete education error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Experience Controllers
export const addExperience = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const validation = experienceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const experienceData = validation.data;
    
    const experience = await prisma.experience.create({
      data: {
        ...experienceData,
        startDate: new Date(experienceData.startDate),
        endDate: experienceData.endDate ? new Date(experienceData.endDate) : null,
        seekerId: req.user.jobSeekerId!
      }
    });

    res.status(201).json({
      success: true,
      message: "Experience added successfully",
      data: experience
    });

  } catch (error) {
    console.error("Add experience error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const updateExperience = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const experienceId = parseInt(req.params.experienceId);
    if (!experienceId) {
      res.status(400).json({
        success: false,
        message: "Experience ID is required"
      });
      return;
    }

    const validation = experienceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const experienceData = validation.data;
    
    const updatedExperience = await prisma.experience.update({
      where: {
        id: experienceId,
        seekerId: req.user.jobSeekerId!
      },
      data: {
        ...experienceData,
        startDate: new Date(experienceData.startDate),
        endDate: experienceData.endDate ? new Date(experienceData.endDate) : null
      }
    });

    res.status(200).json({
      success: true,
      message: "Experience updated successfully",
      data: updatedExperience
    });

  } catch (error) {
    console.error("Update experience error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const deleteExperience = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const experienceId = parseInt(req.params.experienceId);
    if (!experienceId) {
      res.status(400).json({
        success: false,
        message: "Experience ID is required"
      });
      return;
    }

    await prisma.experience.delete({
      where: {
        id: experienceId,
        seekerId: req.user.jobSeekerId!
      }
    });

    res.status(200).json({
      success: true,
      message: "Experience deleted successfully"
    });

  } catch (error) {
    console.error("Delete experience error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Project Controllers
export const addProject = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const validation = projectSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const projectData = validation.data;
    
    const project = await prisma.project.create({
      data: {
        ...projectData,
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
        seekerId: req.user.jobSeekerId!
      }
    });

    res.status(201).json({
      success: true,
      message: "Project added successfully",
      data: project
    });

  } catch (error) {
    console.error("Add project error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const projectId = parseInt(req.params.projectId);
    if (!projectId) {
      res.status(400).json({
        success: false,
        message: "Project ID is required"
      });
      return;
    }

    const validation = projectSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const projectData = validation.data;
    
    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
        seekerId: req.user.jobSeekerId!
      },
      data: {
        ...projectData,
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null
      }
    });

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject
    });

  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const projectId = parseInt(req.params.projectId);
    if (!projectId) {
      res.status(400).json({
        success: false,
        message: "Project ID is required"
      });
      return;
    }

    await prisma.project.delete({
      where: {
        id: projectId,
        seekerId: req.user.jobSeekerId!
      }
    });

    res.status(200).json({
      success: true,
      message: "Project deleted successfully"
    });

  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Preferences Controllers
export const updatePreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const validation = preferencesSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const preferencesData = validation.data;

    const preferences = await prisma.preferences.upsert({
      where: { seekerId: req.user.jobSeekerId! },
      create: {
        ...preferencesData,
        seekerId: req.user.jobSeekerId!
      },
      update: preferencesData
    });

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      data: preferences
    });

  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const preferences = await prisma.preferences.findUnique({
      where: { seekerId: req.user.jobSeekerId! }
    });

    res.status(200).json({
      success: true,
      message: "Preferences retrieved successfully",
      data: preferences
    });

  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


export const checkProfileStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        profilePicture: true,
        role: true,
        jobSeeker: {
          select: {
            id: true,
            resume: true,
            linkedin: true,
            github: true,
            skills: true,
            education: {
              select: { id: true }
            },
            experience: {
              select: { id: true }
            },
            projects: {
              select: { id: true }
            },
            preferences: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    // Check completion status for job seekers
    const basicDetailsComplete = !!(user.name && user.phone && user.location);
    const jobSeekerProfileComplete = !!(user.jobSeeker && user.jobSeeker.skills.length > 0);
    const hasEducation = !!(user.jobSeeker?.education && user.jobSeeker.education.length > 0);
    const hasExperience = !!(user.jobSeeker?.experience && user.jobSeeker?.experience.length > 0);
    const hasProjects = !!(user.jobSeeker?.projects && user.jobSeeker.projects.length > 0);
    const hasPreferences = !!user.jobSeeker?.preferences;

    let nextStep = "";
    let completionPercentage = 0;
    let profileSections = {
      basicDetails: basicDetailsComplete,
      jobSeekerProfile: jobSeekerProfileComplete,
      education: hasEducation,
      experience: hasExperience,
      projects: hasProjects,
      preferences: hasPreferences
    };

    // Calculate completion percentage and next step
    if (!basicDetailsComplete) {
      nextStep = "basic_details";
      completionPercentage = 0;
    } else if (!jobSeekerProfileComplete) {
      nextStep = "job_seeker_profile";
      completionPercentage = 16;
    } else if (!hasEducation) {
      nextStep = "education";
      completionPercentage = 33;
    } else if (!hasExperience) {
      nextStep = "experience";
      completionPercentage = 50;
    } else if (!hasProjects) {
      nextStep = "projects";
      completionPercentage = 66;
    } else if (!hasPreferences) {
      nextStep = "preferences";
      completionPercentage = 83;
    } else {
      nextStep = "complete";
      completionPercentage = 100;
    }

    // Count completed sections for more accurate percentage
    const completedSections = Object.values(profileSections).filter(Boolean).length;
    const totalSections = Object.keys(profileSections).length;
    completionPercentage = Math.round((completedSections / totalSections) * 100);

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user,
          jobSeeker: user.jobSeeker || null
        },
        profileStatus: {
          ...profileSections,
          nextStep,
          completionPercentage,
          isComplete: completionPercentage === 100,
          sectionsCompleted: completedSections,
          totalSections
        }
      }
    });

  } catch (error) {
    console.error("Check job seeker profile status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

