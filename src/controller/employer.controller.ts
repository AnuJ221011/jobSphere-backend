import { Request, Response } from "express";
import { PrismaClient, CompanyRole } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Validation schemas
const createEmployerProfileSchema = z.object({
  jobTitle: z.string().min(2, "Job title must be at least 2 characters").max(100).optional(),
  department: z.string().min(2, "Department must be at least 2 characters").max(50).optional()
});

const updateEmployerProfileSchema = z.object({
  // User table fields that can be updated
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters").optional(),
  phone: z.string().min(10, "Phone must be at least 10 characters").max(15, "Phone must be less than 15 characters").optional(),
  location: z.string().min(2, "Location must be at least 2 characters").max(100, "Location must be less than 100 characters").optional(),
  profilePicture: z.string().url("Invalid profile picture URL").optional().or(z.literal("")),
  // Employer table fields
  jobTitle: z.string().min(2, "Job title must be at least 2 characters").max(100).optional(),
  department: z.string().min(2, "Department must be at least 2 characters").max(50).optional()
});

const updateUserBasicDetailsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
  phone: z.string().min(10, "Phone must be at least 10 characters").max(15, "Phone must be less than 15 characters"),
  location: z.string().min(2, "Location must be at least 2 characters").max(100, "Location must be less than 100 characters"),
  profilePicture: z.string().url("Invalid profile picture URL").optional().or(z.literal(""))
});

const updateSettingsSchema = z.object({
  role: z.nativeEnum(CompanyRole).optional(),
  jobTitle: z.string().min(2).max(100).optional(),
  department: z.string().min(2).max(50).optional()
});

export const updateUserBasicDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    if (req.user.role !== "EMPLOYER") {
      res.status(403).json({
        success: false,
        message: "Access denied: Only users with EMPLOYER role can update profile"
      });
      return;
    }

    // Validate request body
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

    // Update user basic details
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
      message: "Basic details updated successfully. Next step: Complete your employer profile.",
      data: updatedUser,
      nextStep: "employer_profile_details"
    });

  } catch (error) {
    console.error("Update user basic details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


// Create employer profile
export const createEmployerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    // Check if user is an employer
    if (req.user.role !== "EMPLOYER") {
      res.status(403).json({
        success: false,
        message: "Access denied: Only users with EMPLOYER role can create employer profiles"
      });
      return;
    }

    // Check if user has completed basic details
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true, phone: true, location: true }
    });

    if (!user?.name || !user?.phone || !user?.location) {
      res.status(400).json({
        success: false,
        message: "Please complete your basic details first (name, phone, location)",
        step: "basic_details_required"
      });
      return;
    }

    // Check if employer profile already exists
    const existingEmployer = await prisma.employer.findUnique({
      where: { userId: req.user.id }
    });

    if (existingEmployer) {
      res.status(409).json({
        success: false,
        message: "Employer profile already exists"
      });
      return;
    }

    // Validate request body
    const validation = createEmployerProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const { jobTitle, department } = validation.data;

    // Create employer profile
    const employer = await prisma.employer.create({
      data: {
        userId: req.user.id,
        jobTitle,
        department,
        role: 'RECRUITER' // Default role
      },
      select: {
        id: true,
        userId: true,
        companyId: true,
        jobTitle: true,
        department: true,
        role: true,
        isActive: true,
        joinedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
            profilePicture: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: "Employer profile created successfully. Next step: Select or create a company.",
      data: employer,
      nextSteps: [
        "Search for your company",
        "Select existing company", 
        "Create new company profile"
      ]
    });

  } catch (error) {
    console.error("Create employer profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Check profile completion status
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
        employer: {
          select: {
            id: true,
            companyId: true,
            jobTitle: true,
            department: true,
            company: {
              select: {
                id: true,
                name: true
              }
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

    const basicDetailsComplete = !!(user.name && user.phone && user.location);
    const employerProfileComplete = !!user.employer;
    const companySelected = !!(user.employer?.companyId);

    let nextStep = "";
    let completionPercentage = 0;

    if (!basicDetailsComplete) {
      nextStep = "basic_details";
      completionPercentage = 0;
    } else if (!employerProfileComplete) {
      nextStep = "employer_profile";
      completionPercentage = 33;
    } else if (!companySelected) {
      nextStep = "company_selection";
      completionPercentage = 66;
    } else {
      nextStep = "complete";
      completionPercentage = 100;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user,
          employer: user.employer || null
        },
        profileStatus: {
          basicDetailsComplete,
          employerProfileComplete,
          companySelected,
          nextStep,
          completionPercentage
        }
      }
    });

  } catch (error) {
    console.error("Check profile status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get employer profile
export const getEmployerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "EMPLOYER") {
      res.status(403).json({
        success: false,
        message: "Access denied: Only employers can view employer profiles"
      });
      return;
    }

    const employer = await prisma.employer.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        userId: true,
        companyId: true,
        jobTitle: true,
        department: true,
        role: true,
        isActive: true,
        joinedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
            profilePicture: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            description: true,
            industry: true,
            location: true,
            profilePicture: true,
            website: true,
            size: true,
            _count: {
              select: {
                employers: true,
                jobs: { where: { status: "ACTIVE" } }
              }
            }
          }
        },
        _count: {
          select: {
            jobs: true
          }
        }
      }
    });

    if (!employer) {
      res.status(404).json({
        success: false,
        message: "Employer profile not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Employer profile retrieved successfully",
      data: {
        ...employer,
        totalJobsPosted: employer._count.jobs,
        company: employer.company ? {
          ...employer.company,
          totalEmployees: employer.company._count.employers,
          activeJobs: employer.company._count.jobs
        } : null
      }
    });

  } catch (error) {
    console.error("Get employer profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Update employer profile
export const updateEmployerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "EMPLOYER") {
      res.status(403).json({
        success: false,
        message: "Access denied: Only employers can update employer profiles"
      });
      return;
    }

    // Validate request body
    const validation = updateEmployerProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const { name, phone, location, profilePicture, jobTitle, department } = validation.data;

    // Check if employer profile exists
    const existingEmployer = await prisma.employer.findUnique({
      where: { userId: req.user.id }
    });

    if (!existingEmployer) {
      res.status(404).json({
        success: false,
        message: "Employer profile not found. Please create your profile first."
      });
      return;
    }

    // Update both user and employer data in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user data
      const updatedUser = await tx.user.update({
        where: { id: req.user!.id },
        data: {
          ...(name && { name }),
          ...(phone && { phone }),
          ...(location && { location }),
          ...(profilePicture !== undefined && { profilePicture: profilePicture || null })
        }
      });

      // Update employer data
      const updatedEmployer = await tx.employer.update({
        where: { userId: req.user!.id },
        data: {
          ...(jobTitle && { jobTitle }),
          ...(department && { department })
        },
        include: {
          user: {
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
          },
          company: {
            select: {
              id: true,
              name: true,
              industry: true,
              profilePicture: true
            }
          }
        }
      });

      return updatedEmployer;
    });

    res.status(200).json({
      success: true,
      message: "Employer profile updated successfully",
      data: result
    });

  } catch (error) {
    console.error("Update employer profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get employer dashboard statistics
export const getEmployerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "EMPLOYER" || !req.user.employerId) {
      res.status(403).json({
        success: false,
        message: "Access denied: Employer profile required"
      });
      return;
    }

    // Get comprehensive stats
    const [
      totalJobs,
      activeJobs,
      totalApplications,
      pendingApplications,
      recentJobs,
      applicationsByStatus
    ] = await Promise.all([
      // Total jobs posted by this employer
      prisma.job.count({
        where: { employerId: req.user.employerId }
      }),

      // Active jobs
      prisma.job.count({
        where: { 
          employerId: req.user.employerId,
          status: "ACTIVE"
        }
      }),

      // Total applications for all jobs posted by this employer
      prisma.application.count({
        where: {
          job: { employerId: req.user.employerId }
        }
      }),

      // Pending applications
      prisma.application.count({
        where: {
          job: { employerId: req.user.employerId },
          status: "PENDING"
        }
      }),

      // Recent jobs
      prisma.job.findMany({
        where: { employerId: req.user.employerId },
        select: {
          id: true,
          title: true,
          role: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),

      // Applications by status
      prisma.application.groupBy({
        by: ['status'],
        where: {
          job: { employerId: req.user.employerId }
        },
        _count: {
          status: true
        }
      })
    ]);

    // Format application status data
    const applicationStats = applicationsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as Record<string, number>);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalJobs,
          activeJobs,
          pausedJobs: totalJobs - activeJobs,
          totalApplications,
          pendingApplications
        },
        applicationsByStatus: {
          PENDING: applicationStats.PENDING || 0,
          REVIEWING: applicationStats.REVIEWING || 0,
          SHORTLISTED: applicationStats.SHORTLISTED || 0,
          INTERVIEWED: applicationStats.INTERVIEWED || 0,
          ACCEPTED: applicationStats.ACCEPTED || 0,
          REJECTED: applicationStats.REJECTED || 0
        },
        recentJobs: recentJobs.map(job => ({
          ...job,
          applicationCount: job._count.applications
        }))
      }
    });

  } catch (error) {
    console.error("Get employer stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Update employer settings
export const updateEmployerSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "EMPLOYER" || !req.user.employerId) {
      res.status(403).json({
        success: false,
        message: "Access denied: Employer profile required"
      });
      return;
    }

    const validation = updateSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const updateData = validation.data;

    const updatedEmployer = await prisma.employer.update({
      where: { id: req.user.employerId },
      data: updateData,
      select: {
        id: true,
        jobTitle: true,
        department: true,
        role: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: updatedEmployer
    });

  } catch (error) {
    console.error("Update employer settings error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Delete employer account (removes all data from DB)
export const deleteEmployerAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "EMPLOYER") {
      res.status(403).json({
        success: false,
        message: "Access denied: Only employers can delete employer accounts"
      });
      return;
    }

    const userId = req.user.id;

    // Get employer with job count for feedback
    const employer = await prisma.employer.findUnique({
      where: { userId },
      select: {
        id: true,
        _count: {
          select: {
            jobs: true
          }
        }
      }
    });

    if (!employer) {
      res.status(404).json({
        success: false,
        message: "Employer profile not found"
      });
      return;
    }

    const totalJobs = employer._count.jobs;

    // Delete everything in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete application responses for jobs posted by this employer
      await tx.applicationResponse.deleteMany({
        where: {
          application: {
            job: {
              employerId: employer.id
            }
          }
        }
      });

      // Delete applications for jobs posted by this employer
      await tx.application.deleteMany({
        where: {
          job: {
            employerId: employer.id
          }
        }
      });

      // Delete job form fields for jobs posted by this employer
      await tx.jobFormField.deleteMany({
        where: {
          job: {
            employerId: employer.id
          }
        }
      });

      // Delete jobs posted by this employer
      await tx.job.deleteMany({
        where: {
          employerId: employer.id
        }
      });

      // Delete employer profile
      await tx.employer.delete({
        where: {
          userId: userId
        }
      });

      // Finally delete the user
      await tx.user.delete({
        where: {
          id: userId
        }
      });
    });

    // Clear the auth cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message: `Employer account deleted successfully. Removed ${totalJobs} jobs and all associated data.`
    });

  } catch (error) {
    console.error("Delete employer account error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting account"
    });
  }
};
