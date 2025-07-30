import { PrismaClient, PlatformName, GradeType, QuestionLevel, GenderType } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
    // Hash passwords
    const adminPassword = await bcrypt.hash('adminsecure123', 10);
    const studentPassword = await bcrypt.hash('studentsecure123', 10);
    // Create admin
    const admin = await prisma.admin.create({
        data: {
            name: 'Anuj Kumar',
            email: 'anuj.sot010022@pwioi.com',
            password: adminPassword,
        },
    });
    // Create student
    const student = await prisma.student.create({
        data: {
            name: 'Ankit Raj',
            email: 'ankit.sot010020@pwioi.com',
            password: studentPassword,
            techlioId: 'ankitraj061',
            gender: GenderType.MALE,
            platformLinks: {
                create: [
                    {
                        platform: PlatformName.leetcode,
                        url: 'https://leetcode.com/ankitraj061',
                    },
                    {
                        platform: PlatformName.codeforces,
                        url: 'https://codeforces.com/profile/ankitraj061',
                    },
                ],
            },
            socialLinks: {
                create: [
                    {
                        platform: 'github',
                        url: 'https://github.com/ankitraj061',
                    },
                    {
                        platform: 'linkedin',
                        url: 'https://linkedin.com/in/ankitraj061',
                    },
                ],
            },
            workExperiences: {
                create: {
                    company: 'OpenAI',
                    role: 'Intern',
                    description: 'Worked on AI tooling',
                    fromMonth: 6,
                    fromYear: 2023,
                    toMonth: 8,
                    toYear: 2023,
                    currentlyWorking: false,
                },
            },
            achievements: {
                create: {
                    title: 'Hackathon Winner',
                    description: 'Won TechFest 2023',
                    link: 'https://techfest.com/cert/student1',
                    issueMonth: 3,
                    issueYear: 2023,
                },
            },
            educations: {
                create: {
                    degree: 'B.Tech CSE',
                    collegeName: 'Tech University',
                    gradeType: GradeType.CGPA,
                    CGPA: 8,
                    fromMonth: 7,
                    fromYear: 2020,
                    toMonth: 6,
                    toYear: 2024,
                    currentlyWorking: false,
                },
            },
        },
    });
    // Create a note
    await prisma.note.create({
        data: {
            title: 'Frontend Dev Resources',
            description: 'Next.js, Tailwind, ShadCN',
            link: 'https://frontend-resources.dev',
            adminId: admin.id,
        },
    });
    // Create a question
    await prisma.question.create({
        data: {
            title: 'Two Sum',
            url: 'https://leetcode.com/problems/two-sum',
            level: QuestionLevel.EASY,
            adminId: admin.id,
            customTags: {
                create: [
                    { name: 'Array' },
                    { name: 'HashMap' },
                ],
            },
            topics: {
                create: [
                    { name: 'Data Structures' },
                    { name: 'Algorithms' },
                ],
            },
        },
    });
    console.log('🌱 Database seeded successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:\n', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
