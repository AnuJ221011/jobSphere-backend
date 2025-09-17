import { Router } from "express";
import { getDashboardStats } from "../controller/employerDashboard.controller.js";
import { authEmployer, requireCompany } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/employer/dashboard - Get comprehensive dashboard analytics
/**
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "overview": {
      "totalJobs": 25,
      "activeJobs": 18,
      "totalApplicants": 347,
      "applicantsThisMonth": 42,
      "shortlistedCandidates": 28,
      "pendingApplications": 15,
      "conversionRate": 8
    },
    "applicationStats": {
      "statusDistribution": [
        {
          "status": "PENDING",
          "count": 15,
          "percentage": 4
        },
        {
          "status": "REVIEWING",
          "count": 89,
          "percentage": 26
        },
        {
          "status": "SHORTLISTED",
          "count": 28,
          "percentage": 8
        },
        {
          "status": "INTERVIEWED",
          "count": 45,
          "percentage": 13
        },
        {
          "status": "ACCEPTED",
          "count": 12,
          "percentage": 3
        },
        {
          "status": "REJECTED",
          "count": 158,
          "percentage": 46
        }
      ],
      "totalApplications": 347
    },
    "recentActivity": [
      {
        "id": 892,
        "candidateName": "Priya Sharma",
        "candidateEmail": "priya.sharma@gmail.com",
        "candidatePhoto": "https://example.com/photos/priya.jpg",
        "jobTitle": "Senior Full Stack Developer",
        "jobRole": "FULLSTACK_DEVELOPER",
        "status": "PENDING",
        "appliedAt": "2025-09-17T14:22:00.000Z",
        "timeAgo": "2h ago"
      },
      {
        "id": 891,
        "candidateName": "Rohit Kumar",
        "candidateEmail": "rohit.kumar@outlook.com",
        "candidatePhoto": null,
        "jobTitle": "React Developer",
        "jobRole": "FRONTEND_DEVELOPER", 
        "status": "REVIEWING",
        "appliedAt": "2025-09-17T11:45:00.000Z",
        "timeAgo": "5h ago"
      }
      // ... 8 more recent activities
    ],
    "analytics": {
      "applicationsOverTime": [
        {
          "month": "2025-04",
          "applications": 45,
          "monthName": "Apr 2025"
        },
        {
          "month": "2025-05", 
          "applications": 62,
          "monthName": "May 2025"
        }
        // ... 4 more months
      ],
      "topJobRoles": [
        {
          "role": "FULLSTACK_DEVELOPER",
          "totalApplications": 89,
          "jobCount": 4
        },
        {
          "role": "BACKEND_DEVELOPER",
          "totalApplications": 67,
          "jobCount": 3
        }
        // ... 7 more roles
      ],
      "topPerformingJobs": [
        {
          "id": 156,
          "title": "Senior Full Stack Developer",
          "role": "FULLSTACK_DEVELOPER", 
          "applicationCount": 45,
          "createdAt": "2025-08-15T10:00:00.000Z",
          "daysActive": 33
        }
        // ... 4 more jobs
      ],
      "hiringTrends": [
        {
          "month": "2025-04",
          "hired": 3,
          "monthName": "Apr 2025"
        }
        // ... 5 more months
      ]
    },
    "insights": {
      "averageApplicationsPerJob": 14,
      "monthlyGrowth": 35,
      "mostPopularRole": "FULLSTACK_DEVELOPER",
      "responseRate": 96
    }
  }
}
**/


router.get("/", authEmployer, requireCompany, getDashboardStats);

export default router;