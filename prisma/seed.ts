// // prisma/seed.ts
// import {
//   PrismaClient,
//   Role,
//   JobRole,
//   JobType,
//   FieldType,
//   ApplicationStatus,
// } from '@prisma/client';
// import bcrypt from 'bcryptjs';

// const hashedPassword = await bcrypt.hash('password123', 10);

// const prisma = new PrismaClient();

// async function main() {
//   console.log('Starting seed...');

//   // 1) Create Users
//   const seekerUser = await prisma.user.upsert({
//     where: { email: 'alice@app.test' },
//     update: {},
//     create: {
//       name: 'Alice Applicant',
//       email: 'alice@app.test',
//       password: hashedPassword,
//       phone: '555-0100',
//       location: 'Bengaluru, IN',
//       role: Role.JOB_SEEKER,
//     },
//   });
//   console.log('Created job seeker user:', seekerUser.email);

//   const employerUser = await prisma.user.upsert({
//     where: { email: 'emma@employer.test' },
//     update: {},
//     create: {
//       name: 'Emma Employer',
//       email: 'emma@employer.test',
//       password: hashedPassword,
//       phone: '555-0200',
//       location: 'Mumbai, IN',
//       role: Role.EMPLOYER,
//     },
//   });
//   console.log('Created employer user:', employerUser.email);

//   // 2) Create JobSeeker profile
//   let seeker;
//   try {
//     seeker = await prisma.jobSeeker.findUnique({
//       where: { userId: seekerUser.id },
//     });

//     if (!seeker) {
//       seeker = await prisma.jobSeeker.create({
//         data: {
//           userId: seekerUser.id,
//           resume: '/resumes/alice.pdf',
//           linkedin: 'alice_linkedin',
//           github: 'alice_github',
//           skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'React', 'Prisma'],
//         },
//       });
//       console.log('Created job seeker profile');

//       // Create education
//       await prisma.education.create({
//         data: {
//           seekerId: seeker.id,
//           institution: 'IIT Madras',
//           degree: 'B.Tech',
//           fieldOfStudy: 'Computer Science',
//           startDate: new Date('2018-08-01'),
//           endDate: new Date('2022-05-15'),
//           grade: '8.9 CGPA',
//           description: 'Focused on distributed systems and databases.',
//         },
//       });

//       // Create experience
//       await prisma.experience.create({
//         data: {
//           seekerId: seeker.id,
//           company: 'StartupX',
//           position: 'Backend Developer',
//           startDate: new Date('2022-06-01'),
//           endDate: null,
//           isCurrent: true,
//           description: 'Built APIs and background jobs with Node.js and PostgreSQL.',
//           location: 'Remote',
//         },
//       });

//       // Create project
//       await prisma.project.create({
//         data: {
//           seekerId: seeker.id,
//           title: 'JobMatch',
//           description: 'Job matching app with recommendation logic.',
//           technologies: ['Next.js', 'Prisma', 'PostgreSQL'],
//           startDate: new Date('2023-01-01'),
//           endDate: null,
//           githubUrl: null,
//           liveUrl: null,
//           isActive: true,
//         },
//       });

//       // Create preferences
//       await prisma.preferences.create({
//         data: {
//           seekerId: seeker.id,
//           preferredRoles: [JobRole.FULLSTACK_DEVELOPER, JobRole.BACKEND_DEVELOPER],
//           preferredJobTypes: [JobType.FULL_TIME, JobType.CONTRACT],
//           preferredLocations: ['Bengaluru', 'Remote'],
//           salaryExpectationMin: 1200000,
//           salaryExpectationMax: 2000000,
//           remoteWork: true,
//           willingToRelocate: true,
//         },
//       });
//     }
//   } catch (error) {
//     console.error('Error creating job seeker:', error);
//     throw error;
//   }

//   // 3) Create Employer
//   let employer;
//   try {
//     employer = await prisma.employer.findUnique({
//       where: { userId: employerUser.id },
//     });

//     if (!employer) {
//       employer = await prisma.employer.create({
//         data: {
//           userId: employerUser.id,
//           companyName: 'Acme Corp',
//           companyUrl: null,
//           companySize: '51-200',
//           industry: 'Software',
//         },
//       });
//       console.log('Created employer profile');
//     }
//   } catch (error) {
//     console.error('Error creating employer:', error);
//     throw error;
//   }

//   // 4) Create Jobs (only if they don't exist)
//   const existingJobs = await prisma.job.findMany({
//     where: { employerId: employer.id },
//   });

//   let job1, job2;

//   if (existingJobs.length === 0) {
//     // Create Job 1
//     job1 = await prisma.job.create({
//       data: {
//         employerId: employer.id,
//         title: 'Full-Stack Engineer',
//         role: JobRole.FULLSTACK_DEVELOPER,
//         description: 'Build features across the stack (API, DB, UI).',
//         requirements: '3+ years with TypeScript/React/Node',
//         location: 'Remote',
//         jobType: JobType.FULL_TIME,
//         salaryMin: 1500000,
//         salaryMax: 2400000,
//         isActive: true,
//       },
//     });

//     // Create form fields for job 1
//     await prisma.jobFormField.createMany({
//       data: [
//         {
//           jobId: job1.id,
//           label: 'Expected CTC (INR)',
//           fieldType: FieldType.NUMBER,
//           isRequired: true,
//           order: 1,
//         },
//         {
//           jobId: job1.id,
//           label: 'Why should we hire you?',
//           fieldType: FieldType.TEXTAREA,
//           isRequired: true,
//           order: 2,
//         },
//         {
//           jobId: job1.id,
//           label: 'Resume path',
//           fieldType: FieldType.RESUME_URL,
//           isRequired: false,
//           order: 3,
//         },
//       ],
//     });

//     // Create Job 2
//     job2 = await prisma.job.create({
//       data: {
//         employerId: employer.id,
//         title: 'Data Analyst Intern',
//         role: JobRole.DATA_ANALYST,
//         description: 'Assist with dashboards, ETL, and ad-hoc analyses.',
//         requirements: 'SQL and Python (basics)',
//         location: 'Bengaluru',
//         jobType: JobType.INTERNSHIP,
//         salaryMin: 20000,
//         salaryMax: 40000,
//         isActive: true,
//       },
//     });

//     // Create form fields for job 2
//     await prisma.jobFormField.createMany({
//       data: [
//         {
//           jobId: job2.id,
//           label: 'Portfolio path',
//           fieldType: FieldType.TEXT,
//           isRequired: false,
//           order: 1,
//         },
//         {
//           jobId: job2.id,
//           label: 'Available from',
//           fieldType: FieldType.DATE,
//           isRequired: true,
//           order: 2,
//         },
//       ],
//     });

//     console.log('Created 2 jobs with form fields');
//   } else {
//     job1 = existingJobs[0];
//     job2 = existingJobs[1];
//     console.log('Jobs already exist, using existing jobs');
//   }

//   // 5) Create Applications with responses
//   if (job1 && seeker) {
//     const job1Fields = await prisma.jobFormField.findMany({
//       where: { jobId: job1.id },
//       orderBy: { order: 'asc' },
//     });

//     const existingApp1 = await prisma.application.findUnique({
//       where: { jobId_seekerId: { jobId: job1.id, seekerId: seeker.id } },
//     });

//     if (!existingApp1) {
//       const application1 = await prisma.application.create({
//         data: {
//           jobId: job1.id,
//           seekerId: seeker.id,
//           status: ApplicationStatus.PENDING,
//         },
//       });

//       // Create responses for job 1
//       for (const field of job1Fields) {
//         let answer = 'N/A';
//         if (field.fieldType === FieldType.NUMBER) answer = '1800000';
//         if (field.fieldType === FieldType.TEXTAREA)
//           answer = 'Full-stack engineer with strong TypeScript and DB skills.';
//         if (field.fieldType === FieldType.RESUME_URL) answer = '/resumes/alice.pdf';

//         await prisma.applicationResponse.create({
//           data: {
//             applicationId: application1.id,
//             fieldId: field.id,
//             answer,
//           },
//         });
//       }
//       console.log('Created application for Full-Stack Engineer job');
//     }
//   }

//   if (job2 && seeker) {
//     const job2Fields = await prisma.jobFormField.findMany({
//       where: { jobId: job2.id },
//       orderBy: { order: 'asc' },
//     });

//     const existingApp2 = await prisma.application.findUnique({
//       where: { jobId_seekerId: { jobId: job2.id, seekerId: seeker.id } },
//     });

//     if (!existingApp2) {
//       const application2 = await prisma.application.create({
//         data: {
//           jobId: job2.id,
//           seekerId: seeker.id,
//           status: ApplicationStatus.REVIEWING,
//         },
//       });

//       // Create responses for job 2
//       for (const field of job2Fields) {
//         let answer = 'N/A';
//         if (field.fieldType === FieldType.TEXT) answer = 'portfolio/alice';
//         if (field.fieldType === FieldType.DATE)
//           answer = new Date().toISOString().split('T')[0];

//         await prisma.applicationResponse.create({
//           data: {
//             applicationId: application2.id,
//             fieldId: field.id,
//             answer,
//           },
//         });
//       }
//       console.log('Created application for Data Analyst Intern job');
//     }
//   }

//   console.log('Seed completed successfully!');
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//     console.log('✅ Seed operation finished');
//   })
//   .catch(async (e) => {
//     console.error('❌ Seed failed:', e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });