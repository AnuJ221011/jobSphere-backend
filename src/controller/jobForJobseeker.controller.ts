import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const jobFilterSchema = z.object({
  role: z.string().optional(),
  jobType: z.string().optional(),
  location: z.string().optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  companyId: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('10'),
  search: z.string().optional(),
});

const jobApplicationSchema = z.object({
  responses: z.array(z.object({
    fieldId: z.number(),
    answer: z.string()
  }))
});

export class JobSeekerController {
  // Get all jobs with filters (public endpoint with optional auth)
  static async getAllJobs(req: Request, res: Response) {
    try {
      const validation = jobFilterSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.error.issues
        });
      }

      const {
        role,
        jobType,
        location,
        salaryMin,
        salaryMax,
        companyId,
        page,
        limit,
        search
      } = validation.data;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Build where clause
      const whereClause: any = {
        status: 'ACTIVE'
      };

      if (role) {
        whereClause.role = role;
      }

      if (jobType) {
        whereClause.jobType = jobType;
      }

      if (location) {
        whereClause.location = {
          contains: location,
          mode: 'insensitive'
        };
      }

      if (salaryMin) {
        whereClause.salaryMin = {
          gte: parseFloat(salaryMin)
        };
      }

      if (salaryMax) {
        whereClause.salaryMax = {
          lte: parseFloat(salaryMax)
        };
      }

      if (companyId) {
        whereClause.companyId = parseInt(companyId);
      }

      if (search) {
        whereClause.OR = [
          {
            title: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            company: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          }
        ];
      }

      const [jobs, totalCount] = await Promise.all([
        prisma.job.findMany({
          where: whereClause,
          skip,
          take,
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
            employer: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true
                  }
                }
              }
            },
            _count: {
              select: {
                applications: true
              }
            },
            // Include applications only if user is authenticated as job seeker
            applications: req.user?.jobSeekerId ? {
              where: {
                seekerId: req.user.jobSeekerId
              },
              select: {
                id: true,
                status: true,
                appliedAt: true
              }
            } : false
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.job.count({
          where: whereClause
        })
      ]);

      const totalPages = Math.ceil(totalCount / take);

      res.status(200).json({
        success: true,
        data: {
          jobs,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get job by ID with form fields (public endpoint with optional auth)
  static async getJobById(req: Request, res: Response) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'Job ID is required'
        });
      }

      const job = await prisma.job.findUnique({
        where: {
          id: parseInt(jobId),
          status: 'ACTIVE'
        },
        include: {
          company: true,
          employer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
          formFields: {
            orderBy: {
              order: 'asc'
            }
          },
          // Include applications only if user is authenticated as job seeker
          applications: req.user?.jobSeekerId ? {
            where: {
              seekerId: req.user.jobSeekerId
            },
            select: {
              id: true,
              status: true,
              appliedAt: true
            }
          } : false,
          _count: {
            select: {
              applications: true
            }
          }
        }
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      res.status(200).json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Apply for a job (requires job seeker auth)
  static async applyForJob(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      // Get jobSeekerId from middleware
      const seekerId = req.user!.jobSeekerId;

      if (!seekerId) {
        return res.status(400).json({
          success: false,
          message: 'Job seeker profile not found. Please complete your profile first.'
        });
      }

      const validation = jobApplicationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid application data',
          errors: validation.error.issues
        });
      }

      const { responses } = validation.data;

      // Check if job exists and is active
      const job = await prisma.job.findUnique({
        where: {
          id: parseInt(jobId),
          status: 'ACTIVE'
        },
        include: {
          formFields: true
        }
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or no longer active'
        });
      }

      // Check if already applied
      const existingApplication = await prisma.application.findUnique({
        where: {
          jobId_seekerId: {
            jobId: parseInt(jobId),
            seekerId: seekerId
          }
        }
      });

      if (existingApplication) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied for this job'
        });
      }

      // Validate required fields
      const requiredFields = job.formFields.filter(field => field.isRequired);
      const responseFieldIds = responses.map(r => r.fieldId);
      
      for (const field of requiredFields) {
        if (!responseFieldIds.includes(field.id)) {
          return res.status(400).json({
            success: false,
            message: `Required field "${field.label}" is missing`
          });
        }
      }

      // Create application with responses
      const application = await prisma.application.create({
        data: {
          jobId: parseInt(jobId),
          seekerId: seekerId,
          responses: {
            create: responses.map(response => ({
              fieldId: response.fieldId,
              answer: response.answer
            }))
          }
        },
        include: {
          responses: {
            include: {
              field: true
            }
          },
          job: {
            include: {
              company: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: application
      });
    } catch (error) {
      console.error('Error applying for job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit application',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get job seeker's applications
  static async getMyApplications(req: Request, res: Response) {
    try {
      // Get jobSeekerId from middleware
      const seekerId = req.user!.jobSeekerId;
      const { status, page = '1', limit = '10' } = req.query;

      if (!seekerId) {
        return res.status(400).json({
          success: false,
          message: 'Job seeker profile not found. Please complete your profile first.'
        });
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const whereClause: any = {
        seekerId: seekerId
      };

      if (status) {
        whereClause.status = status;
      }

      const [applications, totalCount] = await Promise.all([
        prisma.application.findMany({
          where: whereClause,
          skip,
          take,
          include: {
            job: {
              include: {
                company: {
                  select: {
                    name: true,
                    profilePicture: true,
                    location: true
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
          }
        }),
        prisma.application.count({
          where: whereClause
        })
      ]);

      const totalPages = Math.ceil(totalCount / take);

      res.status(200).json({
        success: true,
        data: {
          applications,
          pagination: {
            currentPage: parseInt(page as string),
            totalPages,
            totalCount,
            hasNext: parseInt(page as string) < totalPages,
            hasPrev: parseInt(page as string) > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Withdraw application
  static async withdrawApplication(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;
      const seekerId = req.user!.jobSeekerId;

      if (!seekerId) {
        return res.status(400).json({
          success: false,
          message: 'Job seeker profile not found. Please complete your profile first.'
        });
      }

      const application = await prisma.application.findFirst({
        where: {
          id: parseInt(applicationId),
          seekerId: seekerId,
          status: {
            in: ['PENDING', 'REVIEWING']
          }
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found or cannot be withdrawn'
        });
      }

      const updatedApplication = await prisma.application.update({
        where: {
          id: parseInt(applicationId)
        },
        data: {
          status: 'WITHDRAWN'
        },
        include: {
          job: {
            include: {
              company: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Application withdrawn successfully',
        data: updatedApplication
      });
    } catch (error) {
      console.error('Error withdrawing application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to withdraw application',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get recommended jobs based on preferences
  static async getRecommendedJobs(req: Request, res: Response) {
    try {
      const seekerId = req.user!.jobSeekerId;
      const { page = '1', limit = '10' } = req.query;

      if (!seekerId) {
        return res.status(400).json({
          success: false,
          message: 'Job seeker profile not found. Please complete your profile first.'
        });
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      // Get job seeker preferences
      const preferences = await prisma.preferences.findUnique({
        where: {
          seekerId: seekerId
        }
      });

      let whereClause: any = {
        status: 'ACTIVE'
      };

      if (preferences) {
        const conditions: any[] = [];

        if (preferences.preferredRoles.length > 0) {
          conditions.push({
            role: {
              in: preferences.preferredRoles
            }
          });
        }

        if (preferences.preferredJobTypes.length > 0) {
          conditions.push({
            jobType: {
              in: preferences.preferredJobTypes
            }
          });
        }

        if (preferences.preferredLocations.length > 0) {
          conditions.push({
            OR: preferences.preferredLocations.map(location => ({
              location: {
                contains: location,
                mode: 'insensitive'
              }
            }))
          });
        }

        if (preferences.salaryExpectationMin) {
          conditions.push({
            salaryMin: {
              gte: preferences.salaryExpectationMin
            }
          });
        }

        if (conditions.length > 0) {
          whereClause.OR = conditions;
        }
      }

      const [jobs, totalCount] = await Promise.all([
        prisma.job.findMany({
          where: whereClause,
          skip,
          take,
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
            _count: {
              select: {
                applications: true
              }
            },
            applications: {
              where: {
                seekerId: seekerId
              },
              select: {
                id: true,
                status: true,
                appliedAt: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.job.count({
          where: whereClause
        })
      ]);

      const totalPages = Math.ceil(totalCount / take);

      res.status(200).json({
        success: true,
        data: {
          jobs,
          pagination: {
            currentPage: parseInt(page as string),
            totalPages,
            totalCount,
            hasNext: parseInt(page as string) < totalPages,
            hasPrev: parseInt(page as string) > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching recommended jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recommended jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get job statistics for dashboard
  static async getJobStats(req: Request, res: Response) {
    try {
      const seekerId = req.user!.jobSeekerId;

      if (!seekerId) {
        return res.status(400).json({
          success: false,
          message: 'Job seeker profile not found. Please complete your profile first.'
        });
      }

      const [
        totalApplications,
        pendingApplications,
        shortlistedApplications,
        rejectedApplications,
        interviewedApplications,
        acceptedApplications
      ] = await Promise.all([
        prisma.application.count({
          where: { seekerId }
        }),
        prisma.application.count({
          where: { seekerId, status: 'PENDING' }
        }),
        prisma.application.count({
          where: { seekerId, status: 'SHORTLISTED' }
        }),
        prisma.application.count({
          where: { seekerId, status: 'REJECTED' }
        }),
        prisma.application.count({
          where: { seekerId, status: 'INTERVIEWED' }
        }),
        prisma.application.count({
          where: { seekerId, status: 'ACCEPTED' }
        })
      ]);

      const totalActiveJobs = await prisma.job.count({
        where: { status: 'ACTIVE' }
      });

      res.status(200).json({
        success: true,
        data: {
          totalApplications,
          pendingApplications,
          shortlistedApplications,
          rejectedApplications,
          interviewedApplications,
          acceptedApplications,
          totalActiveJobs
        }
      });
    } catch (error) {
      console.error('Error fetching job stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch job statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get application by ID (for job seeker to view their own application details)
  static async getApplicationById(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;
      const seekerId = req.user!.jobSeekerId;

      if (!seekerId) {
        return res.status(400).json({
          success: false,
          message: 'Job seeker profile not found. Please complete your profile first.'
        });
      }

      const application = await prisma.application.findFirst({
        where: {
          id: parseInt(applicationId),
          seekerId: seekerId
        },
        include: {
          job: {
            include: {
              company: true,
              employer: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          responses: {
            include: {
              field: true
            },
            orderBy: {
              field: {
                order: 'asc'
              }
            }
          }
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      res.status(200).json({
        success: true,
        data: application
      });
    } catch (error) {
      console.error('Error fetching application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch application',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get saved jobs (if you implement a save job feature)
  static async getSavedJobs(req: Request, res: Response) {
    try {
      const { page = '1', limit = '10' } = req.query;
      const seekerId = req.user!.jobSeekerId;

      if (!seekerId) {
        return res.status(400).json({
          success: false,
          message: 'Job seeker profile not found. Please complete your profile first.'
        });
      }

      // You might want to add a SavedJob model to your schema for this feature
      // For now, returning empty result as placeholder
      res.status(200).json({
        success: true,
        data: {
          jobs: [],
          pagination: {
            currentPage: parseInt(page as string),
            totalPages: 0,
            totalCount: 0,
            hasNext: false,
            hasPrev: false
          }
        },
        message: 'Saved jobs feature not implemented yet'
      });
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch saved jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
