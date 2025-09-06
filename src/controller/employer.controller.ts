import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Extend Express Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: "JOB_SEEKER" | "EMPLOYER";
        email: string;
        name: string;
        phone?: string;
        location?: string;
        profilePicture?: string;

      };
    }
  }
}

const prisma = new PrismaClient();

// Validation schemas
const employerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyUrl: z.string().url().optional(),
  companySize: z.string().optional(),
  industry: z.string().optional(),
});

const jobSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  role: z.enum([
    'SOFTWARE_ENGINEER', 'BACKEND_DEVELOPER', 'FRONTEND_DEVELOPER',
    'FULLSTACK_DEVELOPER', 'DATA_SCIENTIST', 'DATA_ANALYST',
    'DEVOPS_ENGINEER', 'CLOUD_ENGINEER', 'ML_ENGINEER', 'AI_ENGINEER',
    'MOBILE_DEVELOPER', 'ANDROID_DEVELOPER', 'IOS_DEVELOPER',
    'UI_UX_DESIGNER', 'PRODUCT_MANAGER', 'PROJECT_MANAGER',
    'BUSINESS_ANALYST', 'QA_ENGINEER', 'TEST_AUTOMATION_ENGINEER',
    'CYBERSECURITY_ANALYST', 'NETWORK_ENGINEER', 'SYSTEM_ADMIN',
    'DATABASE_ADMIN', 'BLOCKCHAIN_DEVELOPER', 'GAME_DEVELOPER',
    'TECH_SUPPORT', 'CONTENT_WRITER', 'DIGITAL_MARKETER',
    'SALES_ASSOCIATE', 'HR_MANAGER'
  ]),
  description: z.string().min(1, 'Job description is required'),
  requirements: z.string().optional(),
  location: z.string().optional(),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT']),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  formFields: z.array(z.object({
    label: z.string().min(1, 'Label is required'),
    fieldType: z.enum(['TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'LOCATION', 'RESUME_URL', 'TEXTAREA', 'SELECT', 'MULTISELECT', 'CHECKBOX', 'DATE']),
    isRequired: z.boolean().default(true),
    order: z.number().int().default(0)
  })).optional()
});

// Helper function to validate authentication
const validateAuth = (req: Request, res: Response): number | null => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return req.user.id;
};

// Helper function to parse integer with validation
const parseInteger = (value: string, fieldName: string): number => {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${fieldName}: must be a number`);
  }
  return parsed;
};

// Create employer profile
export const createEmployer = async (req: Request, res: Response) => {
  try {
    const validatedData = employerSchema.parse(req.body);

    const userId = validateAuth(req, res);
    if (userId === null) return;

    // Check if user already has an employer profile
    const existingEmployer = await prisma.employer.findUnique({
      where: { userId }
    });

    if (existingEmployer) {
      return res.status(400).json({ error: 'Employer profile already exists' });
    }

    // Verify user has EMPLOYER role
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== 'EMPLOYER') {
      return res.status(403).json({ error: 'User must have EMPLOYER role' });
    }

    const employer = await prisma.employer.create({
      data: {
        userId,
        ...validatedData
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            location: true,
            profilePicture: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Employer profile created successfully',
      employer
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Create employer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get employer profile
export const getEmployer = async (req: Request, res: Response) => {
  try {
    const employerId = parseInteger(req.params.id, 'employer ID');

    const employer = await prisma.employer.findUnique({
      where: { id: employerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            location: true,
            profilePicture: true
          }
        },
        jobs: {
          select: {
            id: true,
            title: true,
            role: true,
            jobType: true,
            location: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                applications: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!employer) {
      return res.status(404).json({ error: 'Employer not found' });
    }

    res.json(employer);
  } catch (error) {
    console.error('Get employer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update employer profile
export const updateEmployer = async (req: Request, res: Response) => {
  try {
    const employerId = parseInteger(req.params.id, 'employer ID');
    const validatedData = employerSchema.parse(req.body);

    const userId = validateAuth(req, res);
    if (userId === null) return;

    // Check if employer belongs to authenticated user
    const employer = await prisma.employer.findUnique({
      where: { id: employerId }
    });

    if (!employer || employer.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedEmployer = await prisma.employer.update({
      where: { id: employerId },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            location: true,
            profilePicture: true
          }
        }
      }
    });

    res.json({
      message: 'Employer profile updated successfully',
      employer: updatedEmployer
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Update employer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete employer profile
export const deleteEmployer = async (req: Request, res: Response) => {
  try {
    const employerId = parseInteger(req.params.id, 'employer ID');

    const userId = validateAuth(req, res);
    if (userId === null) return;

    // Check if employer belongs to authenticated user
    const employer = await prisma.employer.findUnique({
      where: { id: employerId }
    });

    if (!employer || employer.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.employer.delete({
      where: { id: employerId }
    });

    res.json({ message: 'Employer profile deleted successfully' });
  } catch (error) {
    console.error('Delete employer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get employer's jobs
export const getEmployerJobs = async (req: Request, res: Response) => {
  try {
    const employerId = parseInteger(req.params.id, 'employer ID');
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const { status } = req.query;

    const whereClause: any = { employerId };
    if (status === 'active' || status === 'inactive') {
      whereClause.isActive = status === 'active';
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalJobs = await prisma.job.count({ where: whereClause });

    res.json({
      jobs,
      pagination: {
        page,
        limit,
        total: totalJobs,
        pages: Math.ceil(totalJobs / limit)
      }
    });
  } catch (error) {
    console.error('Get employer jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new job
export const createJob = async (req: Request, res: Response) => {
  try {
    const employerId = parseInteger(req.params.id, 'employer ID');
    const { formFields, ...jobData } = jobSchema.parse(req.body);

    const userId = validateAuth(req, res);
    if (userId === null) return;

    // Verify employer belongs to authenticated user
    const employer = await prisma.employer.findUnique({
      where: { id: employerId }
    });

    if (!employer || employer.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const job = await prisma.job.create({
      data: {
        employerId,
        ...jobData,
        formFields: formFields ? {
          create: formFields
        } : undefined
      },
      include: {
        formFields: true,
        employer: {
          select: {
            companyName: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update job
export const updateJob = async (req: Request, res: Response) => {
  try {
    const employerId = parseInteger(req.params.employerId, 'employer ID');
    const jobId = parseInteger(req.params.jobId, 'job ID');
    const { formFields, ...jobData } = jobSchema.partial().parse(req.body);

    const userId = validateAuth(req, res);
    if (userId === null) return;

    // Verify employer belongs to authenticated user
    const employer = await prisma.employer.findUnique({
      where: { id: employerId }
    });

    if (!employer || employer.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Use transaction for updating job and form fields
    const job = await prisma.$transaction(async (tx) => {
      // Update job data
      const updatedJob = await tx.job.update({
        where: { 
          id: jobId,
          employerId: employerId
        },
        data: jobData
      });

      // Handle form fields if provided
      if (formFields) {
        // Delete existing form fields
        await tx.jobFormField.deleteMany({
          where: { jobId }
        });

        // Create new form fields
        await tx.jobFormField.createMany({
          data: formFields.map(field => ({
            jobId,
            ...field
          }))
        });
      }

      // Return updated job with form fields
      return tx.job.findUnique({
        where: { id: jobId },
        include: {
          formFields: true
        }
      });
    });

    res.json({
      message: 'Job updated successfully',
      job
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete job
export const deleteJob = async (req: Request, res: Response) => {
  try {
    const employerId = parseInteger(req.params.employerId, 'employer ID');
    const jobId = parseInteger(req.params.jobId, 'job ID');

    const userId = validateAuth(req, res);
    if (userId === null) return;

    // Verify employer belongs to authenticated user
    const employer = await prisma.employer.findUnique({
      where: { id: employerId }
    });

    if (!employer || employer.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.job.delete({
      where: { 
        id: jobId,
        employerId: employerId
      }
    });

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get job applications
export const getJobApplications = async (req: Request, res: Response) => {
  try {
    const employerId = parseInteger(req.params.employerId, 'employer ID');
    const jobId = parseInteger(req.params.jobId, 'job ID');
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const { status } = req.query;

    const userId = validateAuth(req, res);
    if (userId === null) return;

    // Verify employer belongs to authenticated user
    const employer = await prisma.employer.findUnique({
      where: { id: employerId }
    });

    if (!employer || employer.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const whereClause: any = { jobId };
    if (status && typeof status === 'string') {
      const validStatuses = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEWED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
      if (validStatuses.includes(status.toUpperCase())) {
        whereClause.status = status.toUpperCase();
      }
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        jobSeeker: {
          include: {
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
        },
        responses: {
          include: {
            field: true
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalApplications = await prisma.application.count({ where: whereClause });

    res.json({
      applications,
      pagination: {
        page,
        limit,
        total: totalApplications,
        pages: Math.ceil(totalApplications / limit)
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update application status
export const updateApplicationStatus = async (req: Request, res: Response) => {
  try {
    const employerId = parseInteger(req.params.employerId, 'employer ID');
    const applicationId = parseInteger(req.params.applicationId, 'application ID');
    const { status } = req.body;

    const userId = validateAuth(req, res);
    if (userId === null) return;

    const validStatuses = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEWED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify employer belongs to authenticated user
    const employer = await prisma.employer.findUnique({
      where: { id: employerId }
    });

    if (!employer || employer.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify application belongs to employer's job
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        job: {
          employerId: employerId
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: { status },
      include: {
        jobSeeker: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        job: {
          select: {
            title: true
          }
        }
      }
    });

    res.json({
      message: 'Application status updated successfully',
      application: updatedApplication
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get employer statistics
export const getEmployerStats = async (req: Request, res: Response) => {
  try {
    const employerId = parseInteger(req.params.id, 'employer ID');

    const userId = validateAuth(req, res);
    if (userId === null) return;

    // Verify employer belongs to authenticated user
    const employer = await prisma.employer.findUnique({
      where: { id: employerId }
    });

    if (!employer || employer.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [
      totalJobs,
      activeJobs,
      totalApplications,
      pendingApplications,
      acceptedApplications,
      rejectedApplications
    ] = await Promise.all([
      prisma.job.count({ where: { employerId } }),
      prisma.job.count({ where: { employerId, isActive: true } }),
      prisma.application.count({
        where: {
          job: { employerId }
        }
      }),
      prisma.application.count({
        where: {
          job: { employerId },
          status: 'PENDING'
        }
      }),
      prisma.application.count({
        where: {
          job: { employerId },
          status: 'ACCEPTED'
        }
      }),
      prisma.application.count({
        where: {
          job: { employerId },
          status: 'REJECTED'
        }
      })
    ]);

    const stats = {
      jobs: {
        total: totalJobs,
        active: activeJobs,
        inactive: totalJobs - activeJobs
      },
      applications: {
        total: totalApplications,
        pending: pendingApplications,
        accepted: acceptedApplications,
        rejected: rejectedApplications,
        reviewing: totalApplications - pendingApplications - acceptedApplications - rejectedApplications
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Get employer stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
