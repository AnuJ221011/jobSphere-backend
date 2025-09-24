import { Request, Response } from "express";
import { PrismaClient, CompanySize } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Validation schemas
const createCompanySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").max(100, "Company name must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters").optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  profilePicture: z.string().url("Invalid profile picture URL").optional().or(z.literal("")),
  size: z.nativeEnum(CompanySize).optional(),
  industry: z.string().min(2, "Industry must be at least 2 characters").max(100, "Industry must be less than 100 characters"),
  location: z.string().min(2, "Location must be at least 2 characters").max(100, "Location must be less than 100 characters").optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional()
});

const updateCompanySchema = createCompanySchema.partial();

// Search companies - public endpoint
export const searchCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: query } = req.query;
    
    if (!query || typeof query !== 'string' || query.length < 2) {
      res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters"
      });
      return;
    }

    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { website: { contains: query, mode: 'insensitive' } },
          { industry: { contains: query, mode: 'insensitive' } }
        ],
        isActive: true
      },
      select: {
        id: true,
        name: true,
        website: true,
        industry: true,
        location: true,
        profilePicture: true,
        size: true,
        _count: {
          select: {
            employers: true,
            jobs: { where: { status: 'ACTIVE' } }
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ],
      take: 10
    });

    res.status(200).json({
      success: true,
      data: {
        companies: companies.map(company => ({
          ...company,
          employeeCount: company._count.employers,
          activeJobsCount: company._count.jobs
        })),
        query,
        total: companies.length
      }
    });

  } catch (error) {
    console.error("Search companies error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Select existing company - updates employer's companyId
export const selectExistingCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = parseInt(req.params.companyId);

    if (!companyId || isNaN(companyId)) {
      res.status(400).json({
        success: false,
        message: "Valid company ID is required"
      });
      return;
    }

    if (!req.user?.employerId) {
      res.status(401).json({
        success: false,
        message: "Employer profile required"
      });
      return;
    }

    // Check if company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: companyId, isActive: true },
      select: {
        id: true,
        name: true,
        industry: true,
        location: true,
        profilePicture: true
      }
    });

    if (!company) {
      res.status(404).json({
        success: false,
        message: "Company not found or inactive"
      });
      return;
    }

    // Check if employer is already associated with a company
    const currentEmployer = await prisma.employer.findUnique({
      where: { id: req.user.employerId },
      select: { companyId: true }
    });

    // if (currentEmployer?.companyId) {
    //   res.status(409).json({
    //     success: false,
    //     message: "You are already associated with a company. Please contact support to change companies."
    //   });
    //   return;
    // }

    // Update employer's companyId
    const updatedEmployer = await prisma.employer.update({
      where: { id: req.user.employerId },
      data: { 
        companyId: companyId,
        joinedAt: new Date()
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
            location: true,
            profilePicture: true,
            website: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `Successfully joined ${company.name}`,
      data: {
        employer: updatedEmployer,
        company: updatedEmployer.company
      }
    });

  } catch (error) {
    console.error("Select company error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Create new company profile
export const createCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.employerId) {
      res.status(401).json({
        success: false,
        message: "Employer profile required"
      });
      return;
    }

    // Check if employer is already associated with a company
    const currentEmployer = await prisma.employer.findUnique({
      where: { id: req.user.employerId },
      select: { companyId: true }
    });

    // if (currentEmployer?.companyId) {
    //   res.status(409).json({
    //     success: false,
    //     message: "You are already associated with a company. Please contact support to change companies."
    //   });
    //   return;
    // }

    // Validate request body
    const validation = createCompanySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const { name, description, website, industry, location, size, foundedYear, profilePicture } = validation.data;

    // Check for duplicate company names (case insensitive)
    const existingCompany = await prisma.company.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        isActive: true
      }
    });

    if (existingCompany) {
      res.status(409).json({
        success: false,
        message: "A company with this name already exists",
        suggestion: {
          id: existingCompany.id,
          name: existingCompany.name,
          message: "You can join the existing company instead"
        }
      });
      return;
    }

    // Create company and associate employer in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: name.trim(),
          description,
          website: website || null,
          profilePicture: profilePicture || null,
          industry,
          location,
          size,
          foundedYear,
          isActive: true
        }
      });

      // Update employer with new companyId and set as ADMIN
      const updatedEmployer = await tx.employer.update({
        where: { id: req.user!.employerId },
        data: { 
          companyId: company.id,
          role: 'ADMIN', // Creator becomes admin
          joinedAt: new Date()
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              description: true,
              website: true,
              industry: true,
              location: true,
              profilePicture: true,
              size: true,
              foundedYear: true
            }
          }
        }
      });

      return { company, employer: updatedEmployer };
    });

    res.status(201).json({
      success: true,
      message: "Company profile created successfully",
      data: {
        company: result.company,
        employer: result.employer
      }
    });

  } catch (error) {
    console.error("Create company error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get my current company
export const getMyCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.employerId) {
      res.status(401).json({
        success: false,
        message: "Employer profile required"
      });
      return;
    }

    const employer = await prisma.employer.findUnique({
      where: { id: req.user.employerId },
      select: {
        id: true,
        companyId: true,
        role: true,
        joinedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            description: true,
            website: true,
            industry: true,
            location: true,
            profilePicture: true,
            size: true,
            foundedYear: true,
            createdAt: true,
            _count: {
              select: {
                employers: true,
                jobs: { where: { status: 'ACTIVE' } }
              }
            }
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
      data: {
        hasCompany: !!employer.company,
        company: employer.company ? {
          ...employer.company,
          employeeCount: employer.company._count.employers,
          activeJobsCount: employer.company._count.jobs,
          myRole: employer.role,
          joinedAt: employer.joinedAt
        } : null
      }
    });

  } catch (error) {
    console.error("Get my company error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Update my company profile
export const updateMyCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.employerId || !req.user?.companyId) {
      res.status(401).json({
        success: false,
        message: "Company association required"
      });
      return;
    }

    // Validate request body
    const validation = updateCompanySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues
      });
      return;
    }

    const updateData = validation.data;

    // Check if employer has permission to update company
    const employer = await prisma.employer.findUnique({
      where: { id: req.user.employerId },
      select: { role: true, companyId: true }
    });

    if (!employer || employer.companyId !== req.user.companyId) {
      res.status(403).json({
        success: false,
        message: "Access denied"
      });
      return;
    }

    if (employer.role !== 'ADMIN' && employer.role !== 'HR_MANAGER') {
      res.status(403).json({
        success: false,
        message: "Only company admins and HR managers can update company profile"
      });
      return;
    }

    // If updating name, check for duplicates
    if (updateData.name) {
      const duplicateCompany = await prisma.company.findFirst({
        where: {
          name: { equals: updateData.name.trim(), mode: 'insensitive' },
          id: { not: req.user.companyId },
          isActive: true
        }
      });

      if (duplicateCompany) {
        res.status(409).json({
          success: false,
          message: "A company with this name already exists"
        });
        return;
      }
    }

    // Update company
    const updatedCompany = await prisma.company.update({
      where: { id: req.user.companyId },
      data: {
        ...updateData,
        name: updateData.name?.trim(),
        website: updateData.website || null,
        profilePicture: updateData.profilePicture || null
      },
      select: {
        id: true,
        name: true,
        description: true,
        website: true,
        industry: true,
        location: true,
        profilePicture: true,
        size: true,
        foundedYear: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Company profile updated successfully",
      data: updatedCompany
    });

  } catch (error) {
    console.error("Update company error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get public company profile
export const getCompanyPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = parseInt(req.params.id);

    if (!companyId || isNaN(companyId)) {
      res.status(400).json({
        success: false,
        message: "Valid company ID is required"
      });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { 
        id: companyId,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        description: true,
        website: true,
        industry: true,
        location: true,
        profilePicture: true,
        size: true,
        foundedYear: true,
        createdAt: true,
        _count: {
          select: {
            employers: true,
            jobs: { where: { status: 'ACTIVE' } }
          }
        },
        jobs: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            title: true,
            role: true,
            location: true,
            jobType: true,
            salaryMin: true,
            salaryMax: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!company) {
      res.status(404).json({
        success: false,
        message: "Company not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        ...company,
        employeeCount: company._count.employers,
        activeJobsCount: company._count.jobs,
        recentJobs: company.jobs
      }
    });

  } catch (error) {
    console.error("Get public company error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


