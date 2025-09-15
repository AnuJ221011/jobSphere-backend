// controllers/jobSeekerDashboardController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const getDashboardData = async (req: Request, res: Response) => {
  try {
    if (!req.user?.jobSeekerId) {
      return res.status(400).json({
        success: false,
        message: "Job seeker ID not found"
      });
    }

    const seekerId = req.user.jobSeekerId;

    // Execute all queries in parallel for better performance
    const [
      applicationStats,
      topJobRoles,
      todayJobsCount,
      yesterdayJobsCount,
      topCompaniesActive,
      topCompaniesTotal,
      allJobs
    ] = await Promise.all([
      // 1. Application Status Stats & Conversion Funnel
      prisma.application.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { seekerId }
      }),

      // 2. Top 5 Most Applied Job Roles with openings and applicants
      prisma.$queryRaw`
        SELECT 
          j.role,
          COUNT(a.id) as applications_by_user,
          SUM(j."noOfOpenings") as total_openings,
          (
            SELECT COUNT(*) 
            FROM "Application" a2 
            JOIN "Job" j2 ON a2."jobId" = j2.id 
            WHERE j2.role = j.role
          ) as total_applicants_for_role
        FROM "Application" a
        JOIN "Job" j ON a."jobId" = j.id
        WHERE a."seekerId" = ${seekerId}
        GROUP BY j.role
        ORDER BY applications_by_user DESC
        LIMIT 5
      `,

      // 3. Today's Job Postings
      (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return prisma.job.count({
          where: {
            createdAt: { gte: today, lt: tomorrow },
            status: 'ACTIVE'
          }
        });
      })(),

      // 4. Yesterday's Job Postings (for trend comparison)
      (() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return prisma.job.count({
          where: {
            createdAt: { gte: yesterday, lt: today },
            status: 'ACTIVE'
          }
        });
      })(),

      // 5. Top Companies by Active Jobs
      prisma.company.findMany({
        where: {
          isActive: true,
          jobs: { some: { status: 'ACTIVE' } }
        },
        select: {
          id: true,
          name: true,
          industry: true,
          _count: { 
            select: { 
              jobs: { where: { status: 'ACTIVE' } } 
            } 
          }
        },
        orderBy: { jobs: { _count: 'desc' } },
        take: 5
      }),

      // 6. Top Companies by Total Jobs
      prisma.company.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          industry: true,
          _count: { select: { jobs: true } }
        },
        orderBy: { jobs: { _count: 'desc' } },
        take: 5
      }),

      // 7. All Active Jobs for Skills Analysis
      prisma.job.findMany({
        where: { status: 'ACTIVE' },
        select: {
          description: true,
          requirements: true
        }
      })
    ]);

    // Process Skills Analysis
    const skillsToSearch = [
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 
      'Java', 'SQL', 'AWS', 'Docker', 'Kubernetes', 'Git', 
      'MongoDB', 'PostgreSQL', 'Express', 'Next.js', 'Vue.js',
      'Angular', 'PHP', 'C++', 'C#', '.NET', 'Spring Boot',
      'HTML', 'CSS', 'Bootstrap', 'Tailwind', 'Redux', 'GraphQL'
    ];

    const skillCounts: { [key: string]: number } = {};

    allJobs.forEach(job => {
      const text = `${job.description || ''} ${job.requirements || ''}`.toLowerCase();
      skillsToSearch.forEach(skill => {
        if (text.includes(skill.toLowerCase())) {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        }
      });
    });

    const topSkills = Object.entries(skillCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([skill, count]) => ({ skill, count }));

    // Calculate trend percentage
    const percentageChange = yesterdayJobsCount > 0 
      ? ((todayJobsCount - yesterdayJobsCount) / yesterdayJobsCount) * 100 
      : todayJobsCount > 0 ? 100 : 0;

    // Format Dashboard Response
    const dashboardData = {
      // 1. Accepted vs Rejected Applications
      applicationStats: {
        accepted: applicationStats.find(s => s.status === 'ACCEPTED')?._count.status || 0,
        rejected: applicationStats.find(s => s.status === 'REJECTED')?._count.status || 0,
        pending: applicationStats.find(s => s.status === 'PENDING')?._count.status || 0,
        reviewing: applicationStats.find(s => s.status === 'REVIEWING')?._count.status || 0,
        shortlisted: applicationStats.find(s => s.status === 'SHORTLISTED')?._count.status || 0,
        interviewed: applicationStats.find(s => s.status === 'INTERVIEWED')?._count.status || 0,
        withdrawn: applicationStats.find(s => s.status === 'WITHDRAWN')?._count.status || 0
      },

      // 2. Application Conversion Funnel
      conversionFunnel: [
        { 
          stage: 'Applied', 
          count: applicationStats.reduce((sum, item) => sum + item._count.status, 0) 
        },
        { 
          stage: 'Reviewing', 
          count: applicationStats.find(s => s.status === 'REVIEWING')?._count.status || 0 
        },
        { 
          stage: 'Shortlisted', 
          count: applicationStats.find(s => s.status === 'SHORTLISTED')?._count.status || 0 
        },
        { 
          stage: 'Interviewed', 
          count: applicationStats.find(s => s.status === 'INTERVIEWED')?._count.status || 0 
        },
        { 
          stage: 'Accepted', 
          count: applicationStats.find(s => s.status === 'ACCEPTED')?._count.status || 0 
        }
      ],

      // 3. Top 5 Most Applied Job Roles
      topJobRoles: (topJobRoles as any[]).map((role: any) => ({
        role: role.role,
        applicationsCount: Number(role.applications_by_user),
        totalOpenings: Number(role.total_openings),
        totalApplicants: Number(role.total_applicants_for_role),
        competitionRatio: Number(role.total_applicants_for_role) / Number(role.total_openings) || 0
      })),

      // 4. Today's Job Postings
      todayJobPostings: {
        count: todayJobsCount,
        yesterdayCount: yesterdayJobsCount,
        percentageChange: Math.round(percentageChange * 100) / 100,
        trend: todayJobsCount > yesterdayJobsCount ? 'up' : 
               todayJobsCount < yesterdayJobsCount ? 'down' : 'stable'
      },

      // 5. Top 5 Most Required Skills
      topSkills,

      // 6. Top Companies by Active Job Postings
      topCompaniesByActiveJobs: topCompaniesActive.map(company => ({
        id: company.id,
        name: company.name,
        industry: company.industry,
        activeJobsCount: company._count.jobs
      })),

      // 7. Top Companies by Total Job Postings
      topCompaniesByTotalJobs: topCompaniesTotal.map(company => ({
        id: company.id,
        name: company.name,
        industry: company.industry,
        totalJobsCount: company._count.jobs
      }))
    };

    res.json({
      success: true,
      message: "Dashboard data retrieved successfully",
      data: dashboardData
    });

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export { getDashboardData };
