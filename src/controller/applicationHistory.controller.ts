import { Request, Response } from 'express';
import { PrismaClient, ApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class ApplicationHistoryController {
  // Get all application history for a job seeker
  static async getApplicationHistory(req: Request, res: Response) {
    try {
      const { jobSeekerId } = req.params;
      const { status, limit, offset } = req.query;

      // Ensure the authenticated user can only access their own data
      if (req.user?.jobSeekerId !== parseInt(jobSeekerId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own application history.'
        });
      }

      const jobSeekerApplications = await prisma.jobSeeker.findUnique({
        where: { id: parseInt(jobSeekerId) },
        include: {
          applications: {
            where: status ? { status: status as ApplicationStatus } : {},
            include: {
              job: {
                include: {
                  company: {
                    select: {
                      id: true,
                      name: true,
                      industry: true,
                      location: true,
                      size: true,
                      profilePicture: true
                    }
                  },
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
                }
              }
            },
            orderBy: {
              appliedAt: 'desc'
            },
            take: limit ? parseInt(limit as string) : undefined,
            skip: offset ? parseInt(offset as string) : undefined
          }
        }
      });

      if (!jobSeekerApplications) {
        return res.status(404).json({
          success: false,
          message: 'Job seeker not found'
        });
      }

      res.status(200).json({
        success: true,
        data: jobSeekerApplications.applications,
        total: jobSeekerApplications.applications.length
      });

    } catch (error) {
      console.error('Error fetching application history:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get current user's application history (simplified endpoint)
  static async getMyApplicationHistory(req: Request, res: Response) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const applications = await prisma.application.findMany({
        where: {
          seekerId: req.user!.jobSeekerId!,
          ...(status && { status: status as ApplicationStatus })
        },
        include: {
          job: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  industry: true,
                  location: true,
                  size: true,
                  website: true,
                  profilePicture: true
                }
              },
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
            }
          }
        },
        orderBy: {
          appliedAt: 'desc'
        },
        take: parseInt(limit as string),
        skip
      });

      const totalApplications = await prisma.application.count({
        where: {
          seekerId: req.user!.jobSeekerId!,
          ...(status && { status: status as ApplicationStatus })
        }
      });

      res.status(200).json({
        success: true,
        data: applications,
        pagination: {
          current_page: parseInt(page as string),
          per_page: parseInt(limit as string),
          total: totalApplications,
          total_pages: Math.ceil(totalApplications / parseInt(limit as string))
        }
      });

    } catch (error) {
      console.error('Error fetching my application history:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get applications by status for current user
  static async getMyApplicationsByStatus(req: Request, res: Response) {
    try {
      const { status } = req.params;

      if (!Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status provided'
        });
      }

      const applications = await prisma.application.findMany({
        where: {
          seekerId: req.user!.jobSeekerId!,
          status: status as ApplicationStatus
        },
        include: {
          job: {
            include: {
              company: true
            }
          }
        },
        orderBy: {
          appliedAt: 'desc'
        }
      });

      res.status(200).json({
        success: true,
        data: applications,
        total: applications.length
      });

    } catch (error) {
      console.error('Error fetching applications by status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get applications within date range for current user
  static async getMyApplicationsByDateRange(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Both startDate and endDate are required'
        });
      }

      const applications = await prisma.application.findMany({
        where: {
          seekerId: req.user!.jobSeekerId!,
          appliedAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        },
        include: {
          job: {
            include: {
              company: true
            }
          }
        },
        orderBy: {
          appliedAt: 'desc'
        }
      });

      res.status(200).json({
        success: true,
        data: applications,
        total: applications.length
      });

    } catch (error) {
      console.error('Error fetching applications by date range:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get application statistics for current user
  static async getMyApplicationStats(req: Request, res: Response) {
    try {
      // Total applications count
      const totalApplications = await prisma.application.count({
        where: { seekerId: req.user!.jobSeekerId! }
      });

      // Applications grouped by status
      const applicationsByStatus = await prisma.application.groupBy({
        by: ['status'],
        where: { seekerId: req.user!.jobSeekerId! },
        _count: {
          status: true
        }
      });

      // Recent applications (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentApplications = await prisma.application.findMany({
        where: {
          seekerId: req.user!.jobSeekerId!,
          appliedAt: {
            gte: thirtyDaysAgo
          }
        },
        include: {
          job: {
            include: {
              company: {
                select: {
                  name: true,
                  industry: true
                }
              }
            }
          }
        },
        orderBy: {
          appliedAt: 'desc'
        }
      });

      // Applications by company
      const applicationsByCompany = await prisma.application.findMany({
        where: { seekerId: req.user!.jobSeekerId! },
        include: {
          job: {
            include: {
              company: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      const companyStats = applicationsByCompany.reduce((acc, app) => {
        const companyName = app.job.company.name;
        acc[companyName] = (acc[companyName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Applications by job role
      const applicationsByRole = await prisma.application.findMany({
        where: { seekerId: req.user!.jobSeekerId! },
        include: {
          job: {
            select: {
              role: true
            }
          }
        }
      });

      const roleStats = applicationsByRole.reduce((acc, app) => {
        const role = app.job.role;
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.status(200).json({
        success: true,
        data: {
          total: totalApplications,
          byStatus: applicationsByStatus.reduce((acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
          }, {} as Record<string, number>),
          recent: {
            count: recentApplications.length,
            applications: recentApplications
          },
          byCompany: companyStats,
          byRole: roleStats
        }
      });

    } catch (error) {
      console.error('Error fetching application stats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get single application details
  static async getApplicationDetails(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;

      const application = await prisma.application.findFirst({
        where: { 
          id: parseInt(applicationId),
          seekerId: req.user!.jobSeekerId! // Ensure user can only view their own applications
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
              },
              formFields: true
            }
          },
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
          responses: {
            include: {
              field: true
            }
          }
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found or access denied'
        });
      }

      res.status(200).json({
        success: true,
        data: application
      });

    } catch (error) {
      console.error('Error fetching application details:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Withdraw application (for job seekers)
  static async withdrawApplication(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;

      // Check if application exists and belongs to the current user
      const existingApplication = await prisma.application.findFirst({
        where: {
          id: parseInt(applicationId),
          seekerId: req.user!.jobSeekerId!
        }
      });

      if (!existingApplication) {
        return res.status(404).json({
          success: false,
          message: 'Application not found or access denied'
        });
      }

      // Check if application can be withdrawn
      if (existingApplication.status === 'WITHDRAWN') {
        return res.status(400).json({
          success: false,
          message: 'Application is already withdrawn'
        });
      }

      if (existingApplication.status === 'ACCEPTED' || existingApplication.status === 'REJECTED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot withdraw application that has been processed'
        });
      }

      const updatedApplication = await prisma.application.update({
        where: { id: parseInt(applicationId) },
        data: { status: 'WITHDRAWN' },
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
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
