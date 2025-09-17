import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const employerId = req.user?.employerId;
    const companyId = req.user?.companyId;

    if (!employerId || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Employer ID and Company ID are required"
      });
    }

    // Get current date for monthly calculations
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get date 6 months ago for analytics graphs
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // 1. Job Statistics
    const jobStats = await prisma.job.aggregate({
      where: { employerId, companyId },
      _count: { id: true }
    });

    const activeJobs = await prisma.job.count({
      where: { 
        employerId, 
        companyId,
        status: "ACTIVE" 
      }
    });

    // 2. Applicant Statistics
    const totalApplicants = await prisma.application.count({
      where: {
        job: {
          employerId,
          companyId
        }
      }
    });

    const applicantsThisMonth = await prisma.application.count({
      where: {
        job: {
          employerId,
          companyId
        },
        appliedAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth
        }
      }
    });

    // 3. Application Status Statistics
    const applicationStatusStats = await prisma.application.groupBy({
      by: ["status"],
      where: {
        job: {
          employerId,
          companyId
        }
      },
      _count: { id: true }
    });

    const shortlistedCandidates = applicationStatusStats.find(
      stat => stat.status === "SHORTLISTED"
    )?._count.id || 0;

    const pendingApplications = applicationStatusStats.find(
      stat => stat.status === "PENDING"
    )?._count.id || 0;

    // 4. Recent Activity (last 10 applications)
    const recentActivity = await prisma.application.findMany({
      where: {
        job: {
          employerId,
          companyId
        }
      },
      include: {
        jobSeeker: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                profilePicture: true
              }
            }
          }
        },
        job: {
          select: {
            title: true,
            role: true
          }
        }
      },
      orderBy: { appliedAt: "desc" },
      take: 10
    });

    // 5. Applications Received Over Time (last 6 months, grouped by month)
    const applicationsOverTime = await prisma.application.findMany({
      where: {
        job: {
          employerId,
          companyId
        },
        appliedAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        appliedAt: true
      }
    });

    // Group applications by month
    const monthlyApplications = applicationsOverTime.reduce((acc, app) => {
      const monthKey = app.appliedAt.toISOString().slice(0, 7); // YYYY-MM format
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format for charts
    const applicationsTimeData = Object.entries(monthlyApplications)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month,
        applications: count,
        monthName: new Date(month + "-01").toLocaleDateString("en-US", { 
          month: "short", 
          year: "numeric" 
        })
      }));

    // 6. Job Roles with Most Applications
    const jobRoleStats = await prisma.job.findMany({
      where: { employerId, companyId },
      select: {
        role: true,
        title: true,
        _count: {
          select: {
            applications: true
          }
        }
      }
    });

    // Group by role and sum applications
    const roleApplicationCounts = jobRoleStats.reduce((acc, job) => {
      const role = job.role;
      if (!acc[role]) {
        acc[role] = {
          role,
          totalApplications: 0,
          jobCount: 0
        };
      }
      acc[role].totalApplications += job._count.applications;
      acc[role].jobCount += 1;
      return acc;
    }, {} as Record<string, { role: string; totalApplications: number; jobCount: number }>);

    const topJobRoles = Object.values(roleApplicationCounts)
      .sort((a, b) => b.totalApplications - a.totalApplications)
      .slice(0, 10);

    // 7. Application Status Distribution for Charts
    const statusDistribution = applicationStatusStats.map(stat => ({
      status: stat.status,
      count: stat._count.id,
      percentage: Math.round((stat._count.id / totalApplicants) * 100) || 0
    }));

    // 8. Top Performing Jobs (by application count)
    const topJobs = await prisma.job.findMany({
      where: { employerId, companyId },
      select: {
        id: true,
        title: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        applications: {
          _count: "desc"
        }
      },
      take: 5
    });

    // 9. Monthly Hiring Trends (accepted applications)
    const monthlyHiring = await prisma.application.findMany({
      where: {
        job: {
          employerId,
          companyId
        },
        status: "ACCEPTED",
        updatedAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        updatedAt: true
      }
    });

    const monthlyHiringData = monthlyHiring.reduce((acc, app) => {
      const monthKey = app.updatedAt.toISOString().slice(0, 7);
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hiringTrendsData = Object.entries(monthlyHiringData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month,
        hired: count,
        monthName: new Date(month + "-01").toLocaleDateString("en-US", { 
          month: "short", 
          year: "numeric" 
        })
      }));

    // Construct the response
    const dashboardData = {
      // Overview Stats
      overview: {
        totalJobs: jobStats._count.id,
        activeJobs,
        totalApplicants,
        applicantsThisMonth,
        shortlistedCandidates,
        pendingApplications,
        conversionRate: totalApplicants > 0 
          ? Math.round((shortlistedCandidates / totalApplicants) * 100) 
          : 0
      },

      // Application Status Breakdown
      applicationStats: {
        statusDistribution,
        totalApplications: totalApplicants
      },

      // Recent Activity
      recentActivity: recentActivity.map(app => ({
        id: app.id,
        candidateName: app.jobSeeker.user.name,
        candidateEmail: app.jobSeeker.user.email,
        candidatePhoto: app.jobSeeker.user.profilePicture,
        jobTitle: app.job.title,
        jobRole: app.job.role,
        status: app.status,
        appliedAt: app.appliedAt,
        timeAgo: getTimeAgo(app.appliedAt)
      })),

      // Analytics Data for Charts
      analytics: {
        applicationsOverTime: applicationsTimeData,
        topJobRoles: topJobRoles,
        topPerformingJobs: topJobs.map(job => ({
          id: job.id,
          title: job.title,
          role: job.role,
          applicationCount: job._count.applications,
          createdAt: job.createdAt,
          daysActive: Math.floor((now.getTime() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        })),
        hiringTrends: hiringTrendsData
      },

      // Additional Insights
      insights: {
        averageApplicationsPerJob: jobStats._count.id > 0 
          ? Math.round(totalApplicants / jobStats._count.id) 
          : 0,
        monthlyGrowth: calculateMonthlyGrowth(applicantsThisMonth, totalApplicants),
        mostPopularRole: topJobRoles[0]?.role || null,
        responseRate: totalApplicants > 0 
          ? Math.round(((totalApplicants - pendingApplications) / totalApplicants) * 100)
          : 0
      }
    };

    res.status(200).json({
      success: true,
      message: "Dashboard statistics retrieved successfully",
      data: dashboardData
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching dashboard statistics"
    });
  }
};

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) { // 24 hours
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
}

// Helper function to calculate monthly growth percentage
function calculateMonthlyGrowth(thisMonth: number, total: number): number {
  if (total <= thisMonth) return 0;
  const previousPeriod = total - thisMonth;
  if (previousPeriod === 0) return 100;
  return Math.round(((thisMonth - (previousPeriod / 5)) / (previousPeriod / 5)) * 100);
}