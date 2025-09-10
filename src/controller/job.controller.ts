import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { FieldType } from '@prisma/client';

// Create a new job
export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      role,
      description,
      requirements,
      location,
      jobType,
      salaryMin,
      salaryMax,
      noOfOpenings
    } = req.body;

    if (!title || !role || !description || !jobType) {
      res.status(400).json({
        success: false,
        message: "Title, role, description, and job type are required"
      });
      return;
    }

    const job = await prisma.job.create({
      data: {
        title,
        role,
        description,
        requirements,
        location,
        jobType,
        salaryMin: salaryMin ? parseFloat(salaryMin) : null,
        salaryMax: salaryMax ? parseFloat(salaryMax) : null,
        noOfOpenings: noOfOpenings ? parseInt(noOfOpenings) : 1,
        companyId: req.user!.companyId!,
        employerId: req.user!.employerId!
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
            location: true,
            industry: true
          }
        },
        employer: {
          select: {
            id: true,
            jobTitle: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Create default form fields
    await createDefaultJobFormFields(job.id);

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: { job }
    });

  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Update job details
export const updateJobDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const {
      title,
      role,
      description,
      requirements,
      location,
      jobType,
      salaryMin,
      salaryMax,
      noOfOpenings
    } = req.body;

    const job = await prisma.job.update({
      where: { id: parseInt(jobId) },
      data: {
        ...(title && { title }),
        ...(role && { role }),
        ...(description && { description }),
        ...(requirements && { requirements }),
        ...(location && { location }),
        ...(jobType && { jobType }),
        ...(salaryMin !== undefined && { salaryMin: salaryMin ? parseFloat(salaryMin) : null }),
        ...(salaryMax !== undefined && { salaryMax: salaryMax ? parseFloat(salaryMax) : null }),
        ...(noOfOpenings !== undefined && { noOfOpenings: noOfOpenings ? parseInt(noOfOpenings) : 1 }),
        updatedAt: new Date()
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
            location: true,
            industry: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: { job }
    });

  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Update job status
export const updateJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'COMPLETED', 'PAUSED'].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Valid status is required (ACTIVE, COMPLETED, PAUSED)"
      });
      return;
    }

    const job = await prisma.job.update({
      where: { id: parseInt(jobId) },
      data: {
        status,
        updatedAt: new Date()
      },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      success: true,
      message: `Job status updated to ${status}`,
      data: { job }
    });

  } catch (error) {
    console.error("Update job status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Delete job
export const deleteJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    // Check if job has applications
    const applicationCount = await prisma.application.count({
      where: { jobId: parseInt(jobId) }
    });

    if (applicationCount > 0) {
      res.status(400).json({
        success: false,
        message: "Cannot delete job with existing applications. Consider marking it as COMPLETED instead."
      });
      return;
    }

    await prisma.job.delete({
      where: { id: parseInt(jobId) }
    });

    res.status(200).json({
      success: true,
      message: "Job deleted successfully"
    });

  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get jobs by employer
export const getJobsByEmployer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = '1', limit = '10' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      employerId: req.user!.employerId
    };

    if (status && ['ACTIVE', 'COMPLETED', 'PAUSED'].includes(status as string)) {
      where.status = status;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              profilePicture: true,
              industry: true
            }
          },
          _count: {
            select: {
              applications: true,
              
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.job.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        jobs: jobs.map(job => ({
          ...job,
          totalApplications: job._count.applications,
          pendingApplications: job._count.applications
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error("Get employer jobs error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get job by ID
export const getJobById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            description: true,
            profilePicture: true,
            location: true,
            industry: true,
            size: true,
            website: true
          }
        },
        employer: {
          select: {
            id: true,
            jobTitle: true,
            user: {
              select: {
                name: true
              }
            }
          }
        },
        formFields: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    });

    if (!job) {
      res.status(404).json({
        success: false,
        message: "Job not found"
      });
      return;
    }

    // Check if current user has already applied (if authenticated)
    let hasApplied = false;
    if (req.user && req.user.role === 'JOB_SEEKER' && req.user.jobSeekerId) {
      const application = await prisma.application.findUnique({
        where: {
          jobId_seekerId: {
            jobId: job.id,
            seekerId: req.user.jobSeekerId
          }
        }
      });
      hasApplied = !!application;
    }

    res.status(200).json({
      success: true,
      data: {
        job: {
          ...job,
          totalApplications: job._count.applications,
          hasApplied
        }
      }
    });

  } catch (error) {
    console.error("Get job by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get all jobs (public endpoint with filters)
export const getAllJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      role,
      jobType,
      location,
      industry,
      salaryMin,
      salaryMax,
      page = '1',
      limit = '20'
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const where: any = {
      status: 'ACTIVE'
    };

    // Search in title and description
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Filters
    if (role) where.role = role;
    if (jobType) where.jobType = jobType;
    if (location) where.location = { contains: location as string, mode: 'insensitive' };
    
    if (salaryMin || salaryMax) {
      where.AND = [];
      if (salaryMin) where.AND.push({ salaryMin: { gte: parseFloat(salaryMin as string) } });
      if (salaryMax) where.AND.push({ salaryMax: { lte: parseFloat(salaryMax as string) } });
    }

    if (industry) {
      where.company = {
        industry: { contains: industry as string, mode: 'insensitive' }
      };
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              profilePicture: true,
              location: true,
              industry: true,
              size: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.job.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        jobs: jobs.map(job => ({
          ...job,
          totalApplications: job._count.applications
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        },
        filters: {
          search: search || null,
          role: role || null,
          jobType: jobType || null,
          location: location || null,
          industry: industry || null,
          salaryRange: {
            min: salaryMin ? parseFloat(salaryMin as string) : null,
            max: salaryMax ? parseFloat(salaryMax as string) : null
          }
        }
      }
    });

  } catch (error) {
    console.error("Get all jobs error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Create job form fields
export const createJobForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { fields } = req.body;

    if (!fields || !Array.isArray(fields)) {
      res.status(400).json({
        success: false,
        message: "Fields array is required"
      });
      return;
    }

    // Delete existing custom fields (keep default ones)
    await prisma.jobFormField.deleteMany({
      where: {
        jobId: parseInt(jobId),
        isDefault: false
      }
    });

    // Create new fields
    const createdFields = await Promise.all(
      fields.map((field: any, index: number) =>
        prisma.jobFormField.create({
          data: {
            jobId: parseInt(jobId),
            label: field.label,
            fieldType: field.fieldType,
            isRequired: field.isRequired || true,
            isDefault: false,
            order: field.order || index + 100, // Start after default fields
            options: field.options || []
          }
        })
      )
    );

    res.status(201).json({
      success: true,
      message: "Job form fields created successfully",
      data: { fields: createdFields }
    });

  } catch (error) {
    console.error("Create job form error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Update job form
export const updateJobForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { fields } = req.body;

    if (!fields || !Array.isArray(fields)) {
      res.status(400).json({
        success: false,
        message: "Fields array is required"
      });
      return;
    }

    // Update existing fields or create new ones
    const updatedFields = await Promise.all(
      fields.map(async (field: any) => {
        if (field.id) {
          // Update existing field
          return await prisma.jobFormField.update({
            where: { id: field.id },
            data: {
              label: field.label,
              fieldType: field.fieldType,
              isRequired: field.isRequired,
              order: field.order,
              options: field.options || []
            }
          });
        } else {
          // Create new field
          return await prisma.jobFormField.create({
            data: {
              jobId: parseInt(jobId),
              label: field.label,
              fieldType: field.fieldType,
              isRequired: field.isRequired || true,
              isDefault: false,
              order: field.order || 0,
              options: field.options || []
            }
          });
        }
      })
    );

    res.status(200).json({
      success: true,
      message: "Job form updated successfully",
      data: { fields: updatedFields }
    });

  } catch (error) {
    console.error("Update job form error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get job form
export const getJobForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const fields = await prisma.jobFormField.findMany({
      where: { jobId: parseInt(jobId) },
      orderBy: { order: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: { fields }
    });

  } catch (error) {
    console.error("Get job form error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Delete job form field
export const deleteJobFormField = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fieldId } = req.params;

    const field = await prisma.jobFormField.findUnique({
      where: { id: parseInt(fieldId) }
    });

    if (!field) {
      res.status(404).json({
        success: false,
        message: "Form field not found"
      });
      return;
    }

    if (field.isDefault) {
      res.status(400).json({
        success: false,
        message: "Cannot delete default form fields"
      });
      return;
    }

    await prisma.jobFormField.delete({
      where: { id: parseInt(fieldId) }
    });

    res.status(200).json({
      success: true,
      message: "Form field deleted successfully"
    });

  } catch (error) {
    console.error("Delete form field error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get job applications
export const getJobApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { status, page = '1', limit = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      jobId: parseInt(jobId)
    };

    if (status && ['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEWED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(status as string)) {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          jobSeeker: {
            include: {
              user: {
                select: {
                  id: true,
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
        orderBy: { appliedAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.application.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error("Get job applications error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Update application status
export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    if (!status || !['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEWED', 'ACCEPTED', 'REJECTED'].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Valid status is required"
      });
      return;
    }

    const application = await prisma.application.update({
      where: { id: parseInt(applicationId) },
      data: {
        status,
        updatedAt: new Date()
      },
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

    res.status(200).json({
      success: true,
      message: `Application status updated to ${status}`,
      data: { application }
    });

  } catch (error) {
    console.error("Update application status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Helper function to create default job form fields
const createDefaultJobFormFields = async (jobId: number) => {
  const defaultFields = [
    {
      jobId,
      label: "Full Name",
      fieldType: FieldType.TEXT,
      isRequired: true,
      isDefault: true,
      order: 1
    },
    {
      jobId,
      label: "Email Address",
      fieldType: FieldType.EMAIL,
      isRequired: true,
      isDefault: true,
      order: 2
    },
    {
      jobId,
      label: "Phone Number",
      fieldType: FieldType.PHONE,
      isRequired: true,
      isDefault: true,
      order: 3
    },
    {
      jobId,
      label: "Resume URL",
      fieldType: FieldType.RESUME_URL,
      isRequired: true,
      isDefault: true,
      order: 4
    },
    {
      jobId,
      label: "Years of Experience",
      fieldType: FieldType.YEARS_OF_EXPERIENCE,
      isRequired: true,
      isDefault: true,
      order: 5
    },
    {
      jobId,
      label: "Cover Letter",
      fieldType: FieldType.TEXTAREA,
      isRequired: false,
      isDefault: true,
      order: 6
    }
  ];

  await prisma.jobFormField.createMany({
    data: defaultFields
  });
};
