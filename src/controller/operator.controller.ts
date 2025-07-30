// import { Request, Response } from "express";
// import { prisma } from "../db/prisma.js";
// import { TaskStatus } from "@prisma/client";
// import { startOfDay, endOfDay } from "date-fns";


// const getTodayDailyTasksForOperator = async (req: Request, res: Response) => {
//   try {
//     const operatorId = req.user?.id;
//     if (!operatorId) {
//       return res.status(401).json({ error: "Unauthorized: Operator ID not found" });
//     }

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const tomorrow = new Date(today);
//     tomorrow.setDate(today.getDate() + 1);

//     const dailyTasks = await prisma.dailyTaskInstance.findMany({
//       where: {
//         taskDate: { gte: today, lt: tomorrow },
//         operators: { some: { id: operatorId } },
//       },
//       include: {
//         defaultTask: {
//           include: {
//             admin: {
//               select: {
//                 id: true,
//                 name: true,
//                 email: true, 
//               },
//             },
//           },
//         },
//       },
//     });

//     res.status(200).json({ success: true, tasks: dailyTasks });
//   } catch (error) {
//     console.error("Error fetching daily tasks:", error);
//     res.status(500).json({ error: "Failed to fetch daily tasks" });
//   }
// };



// const getNewTasksForOperator = async (req: Request, res: Response) => {
//   try {
//     const operatorId = req.user?.id;

//     if (!operatorId) {
//       return res.status(401).json({ error: "Unauthorized: Operator ID not found" });
//     }

//     const today = startOfDay(new Date());

//     const newTasks = await prisma.newTask.findMany({
//       where: {
//         operators: {
//           some: {
//             id: operatorId,
//           },
//         },
//         OR: [
//           {
//             assignedDate: {
//               gte: today,
//             },
//           },
//           {
//             dueDate: {
//               gte: today,
//             },
//           },
//         ],
//       },
//       orderBy: {
//         assignedDate: "desc",
//       },
//       include: {
//         admin: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//       },
//     });

//     res.status(200).json({ success: true, tasks: newTasks });
//   } catch (error) {
//     console.error("Error fetching new tasks:", error);
//     res.status(500).json({ error: "Failed to fetch new tasks" });
//   }
// };


// const updateDailyTask = async (req: Request, res: Response) => {
//     try {
//         const operatorId = req.user?.id;
//         const taskId = req.params.id;
//         const { status } = req.body;

//         if (!operatorId) {
//             return res.status(401).json({ error: "Unauthorized: Operator ID not found" });
//         }

//         if (!Object.values(TaskStatus).includes(status)) {
//             return res.status(400).json({ error: "Invalid status value" });
//         }

//         const updatedTask = await prisma.dailyTaskInstance.update({
//             where: { id: taskId },
//             data: {
//                 status,
//                 operators: {
//                     connect: [{ id: operatorId }],
//                 },
//             },
//         });

//         res.status(200).json({ success: true, task: updatedTask });
//     } catch (error) {
//         console.error("Error updating daily task:", error);
//         res.status(500).json({ error: "Failed to update daily task" });
//     }
// };


// const updateNewTask = async (req: Request, res: Response) => {
//     try {
//         const operatorId = req.user?.id;
//         const taskId = req.params.id;
//         const { status } = req.body;

//         if (!operatorId) {
//             return res.status(401).json({ error: "Unauthorized: Operator ID not found" });
//         }

//         if (!Object.values(TaskStatus).includes(status)) {
//             return res.status(400).json({ error: "Invalid status value" });
//         }

//         const updatedTask = await prisma.newTask.update({
//             where: { id: taskId },
//             data: {
//                 status,
//                 operators: {
//                     connect: [{ id: operatorId }],
//                 },
//             },
//         });

//         res.status(200).json({ success: true, task: updatedTask });
//     } catch (error) {
//         console.error("Error updating new task:", error);
//         res.status(500).json({ error: "Failed to update new task" });
//     }
// };

// const getTodayTotalTask = async (req: Request, res: Response) => {
//     try {
//         const operatorId = req.user?.id;

//         if (!operatorId) {
//             return res.status(401).json({ error: "Unauthorized: Operator ID not found" });
//         }

//         const today = new Date();

//         const start = startOfDay(today);
//         const end = endOfDay(today);

//         // Count daily tasks assigned today
//         const dailyTaskCount = await prisma.dailyTaskInstance.count({
//             where: {
//                 taskDate: {
//                     gte: start,
//                     lte: end,
//                 },
//                 operators: {
//                     some: {
//                         id: operatorId,
//                     },
//                 },
//             },
//         });

//         // Count new tasks assigned today
//         const newTaskCount = await prisma.newTask.count({
//             where: {
//                 createdAt: {
//                     gte: start,
//                     lte: end,
//                 },
//                 operators: {
//                     some: {
//                         id: operatorId,
//                     },
//                 },
//             },
//         });

//         const totalTasks = dailyTaskCount + newTaskCount;

//         return res.status(200).json({
//             success: true,
//             operatorId,
//             todayTotalTasks: totalTasks,
//             dailyTaskCount,
//             newTaskCount,
//         });
//     } catch (error) {
//         console.error("Error fetching today's tasks for operator:", error);
//         res.status(500).json({ error: "Failed to fetch today's tasks" });
//     }
// };

// const getCompletionRate = async (req: Request, res: Response) => {
//     try {
//         const operatorId = req.user?.id;

//         if (!operatorId) {
//             return res.status(401).json({ error: "Unauthorized: Operator ID not found" });
//         }

//         const today = new Date();
//         const start = startOfDay(today);
//         const end = endOfDay(today);

//         // DAILY TASKS
//         const dailyTasks = await prisma.dailyTaskInstance.findMany({
//             where: {
//                 taskDate: {
//                     gte: start,
//                     lte: end,
//                 },
//                 operators: {
//                     some: { id: operatorId },
//                 },
//             },
//             select: {
//                 id: true,
//                 status: true,
//             },
//         });

//         const dailyCompleted = dailyTasks.filter(task => task.status === "COMPLETED").length;
//         const totalDaily = dailyTasks.length;

//         // NEW TASKS
//         const newTasks = await prisma.newTask.findMany({
//             where: {
//                 createdAt: {
//                     gte: start,
//                     lte: end,
//                 },
//                 operators: {
//                     some: { id: operatorId },
//                 },
//             },
//             select: {
//                 id: true,
//                 status: true,
//             },
//         });

//         const newCompleted = newTasks.filter(task => task.status === "COMPLETED").length;
//         const totalNew = newTasks.length;

//         // TOTALS
//         const totalTasks = totalDaily + totalNew;
//         const totalCompleted = dailyCompleted + newCompleted;

//         const completionRate = totalTasks === 0 ? 0 : parseFloat(((totalCompleted / totalTasks) * 100).toFixed(2));

//         return res.status(200).json({
//             success: true,
//             operatorId,
//             date: today.toISOString().split('T')[0],
//             totalTasks,
//             completedTasks: totalCompleted,
//             completionRate, // in %
//             breakdown: {
//                 daily: {
//                     total: totalDaily,
//                     completed: dailyCompleted,
//                 },
//                 new: {
//                     total: totalNew,
//                     completed: newCompleted,
//                 }
//             }
//         });

//     } catch (error) {
//         console.error("Error calculating completion rate:", error);
//         res.status(500).json({ error: "Failed to calculate completion rate" });
//     }
// };

// const getStatusCountDaily = async (req: Request, res: Response) => {
//   try {
//     const operatorId = req.user?.id;

//     if (!operatorId) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     const todayStart = startOfDay(new Date());
//     const todayEnd = endOfDay(new Date());

//     // DAILY TASKS
//     const dailyTasks = await prisma.dailyTaskInstance.findMany({
//       where: {
//         taskDate: {
//           gte: todayStart,
//           lte: todayEnd,
//         },
//         operators: {
//           some: {
//             id: operatorId,
//           },
//         },
//       },
//       select: {
//         status: true,
//       },
//     });

//     // NEW TASKS
//     const newTasks = await prisma.newTask.findMany({
//       where: {
//         assignedDate: {
//           gte: todayStart,
//           lte: todayEnd,
//         },
//         operators: {
//           some: {
//             id: operatorId,
//           },
//         },
//       },
//       select: {
//         status: true,
//       },
//     });

//     const statusCounts = {
//       PENDING: 0,
//       IN_PROGRESS: 0,
//       COMPLETED: 0,
//     };

//     dailyTasks.forEach(task => {
//       statusCounts[task.status]++;
//     });

//     newTasks.forEach(task => {
//       statusCounts[task.status]++;
//     });

//     res.status(200).json({
//       success: true,
//       data: statusCounts,
//     });
//   } catch (err) {
//     console.error("Error in getStatusCountDaily:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// const getPriorityCount = async (req: Request, res: Response) => {
//   try {
//     const operatorId = req.user?.id;
//     const todayStart = startOfDay(new Date());
//     const todayEnd = endOfDay(new Date());

//     // Daily Task Priority Count
//     const dailyTaskCounts = await prisma.dailyTaskInstance.groupBy({
//       by: ["priority"],
//       _count: true,
//       where: {
//         taskDate: {
//           gte: todayStart,
//           lte: todayEnd,
//         },
//         operators: {
//           some: {
//             id: operatorId,
//           },
//         },
//       },
//     });

//     // New Task Priority Count
//     const newTaskCounts = await prisma.newTask.groupBy({
//       by: ["priority"],
//       _count: true,
//       where: {
//         assignedDate: {
//           gte: todayStart,
//           lte: todayEnd,
//         },
//         operators: {
//           some: {
//             id: operatorId,
//           },
//         },
//       },
//     });

//     // Combine Results
//     const priorityMap = {
//       LOW: 0,
//       MEDIUM: 0,
//       HIGH: 0,
//     };

//     for (const item of dailyTaskCounts) {
//       priorityMap[item.priority] += item._count;
//     }

//     for (const item of newTaskCounts) {
//       priorityMap[item.priority] += item._count;
//     }

//     res.status(200).json({
//       success: true,
//       data: priorityMap,
//     });
//   } catch (error) {
//     console.error("Error getting priority count:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch priority count",
//     });
//   }
// };

// export { getTodayDailyTasksForOperator, getNewTasksForOperator, updateDailyTask, updateNewTask, getTodayTotalTask, getCompletionRate, getStatusCountDaily ,getPriorityCount };