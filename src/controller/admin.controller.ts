// import { Request, Response } from "express";
// import { prisma } from "../db/prisma.js";
// import { Priority, Prisma, TaskStatus } from "@prisma/client";
// import { startOfDay, endOfDay } from "date-fns";

// const createDefaultTask = async (req: Request, res: Response) => {
//     try {
//         const { title, description, adminId } = req.body;

//         if (!title || !adminId) {
//             return res.status(400).json({ error: "Title and adminId are required" });
//         }

//         const defaultTask = await prisma.defaultTask.create({
//             data: {
//                 title,
//                 description,
//                 adminId,
//             },
//         });

//         res.status(201).json(defaultTask);
//     } catch (error) {
//         console.error("Error creating default task:", error);
//         res.status(500).json({ error: "Failed to create default task" });
//     }
// };

// const getDefaultTasks = async (req: Request, res: Response) => {
//     try {
//         const adminId = req.user?.id;

//         if (!adminId) {
//             return res.status(400).json({ error: "Admin ID is required" });
//         }

//         const tasks = await prisma.defaultTask.findMany({
//             where: {
//                 adminId,
//             },
//             orderBy: {
//                 createdAt: "desc",
//             },
//         });

//         res.status(200).json({
//             success: true,
//             count: tasks.length,
//             data: tasks,
//         });
//     } catch (error) {
//         console.error("Error fetching default tasks:", error);
//         res.status(500).json({ error: "Failed to fetch default tasks" });
//     }
// };

// const updateDefaultTask = async (req: Request, res: Response) => {
//     try {
//         const taskId = req.params.id;
//         const { title, description } = req.body;

//         if (!title && !description) {
//             return res.status(400).json({ error: "At least one of title or description must be provided" });
//         }
//         if (!taskId) {
//             return res.status(400).json({ error: "Task ID is required" });
//         }
//         const existingTask = await prisma.defaultTask.findUnique({
//             where: { id: taskId },
//         });

//         if (!existingTask) {
//             return res.status(404).json({ error: "Default task not found" });
//         }

//         const updatedTask = await prisma.defaultTask.update({
//             where: { id: taskId },
//             data: {
//                 title: title ?? existingTask.title,
//                 description: description ?? existingTask.description,
//             },
//         });

//         res.status(200).json({
//             success: true,
//             message: "Default task updated successfully",
//             data: updatedTask,
//         });
//     } catch (error) {
//         console.error("Error updating default task:", error);
//         res.status(500).json({ error: "Failed to update default task" });
//     }
// };

// const deleteDefaultTask = async (req: Request, res: Response) => {
//     try {
//         const taskId = req.params.id;

//         if (!taskId) {
//             return res.status(400).json({ error: "Task ID is required" });
//         }

//         const existingTask = await prisma.defaultTask.findUnique({
//             where: { id: taskId },
//         });

//         if (!existingTask) {
//             return res.status(404).json({ error: "Default task not found" });
//         }

//         await prisma.defaultTask.delete({
//             where: { id: taskId },
//         });

//         res.status(200).json({
//             success: true,
//             message: "Default task deleted successfully",
//         });
//     } catch (error) {
//         console.error("Error deleting default task:", error);
//         res.status(500).json({ error: "Failed to delete default task" });
//     }
// };



// const createNewTask = async (req: Request, res: Response) => {
//     try {
//         const {
//             title,
//             description,
//             dueDate,
//             priority,
//             status,
//             adminId,
//             operatorIds,
//         } = req.body;

//         if (!title || !adminId || !Array.isArray(operatorIds) || operatorIds.length === 0) {
//             return res.status(400).json({ error: "Title, adminId, and at least one operatorId are required" });
//         }

//         const validPriority = Object.values(Priority).includes(priority)
//             ? priority
//             : Priority.MEDIUM;

//         const validStatus = Object.values(TaskStatus).includes(status)
//             ? status
//             : TaskStatus.PENDING;

//         const newTask = await prisma.newTask.create({
//             data: {
//                 title,
//                 description,
//                 dueDate: dueDate ? new Date(dueDate) : null,
//                 priority: validPriority,
//                 status: validStatus,
//                 adminId,
//                 operators: {
//                     connect: operatorIds.map((id: string) => ({ id })),
//                 },
//             },
//         });

//         res.status(201).json(newTask);
//     } catch (error) {
//         console.error("Error creating new task:", error);
//         res.status(500).json({ error: "Failed to create new task" });
//     }
// };

// const createDailyTask = async (req: Request, res: Response) => {
//     try {
//         const { defaultTaskId, operatorIds, priority, status } = req.body;

//         if (!defaultTaskId || !Array.isArray(operatorIds) || operatorIds.length === 0) {
//             return res.status(400).json({ error: "defaultTaskId and at least one operatorId are required" });
//         }

//         const validPriority = Object.values(Priority).includes(priority)
//             ? priority
//             : Priority.LOW;

//         const validStatus = Object.values(TaskStatus).includes(status)
//             ? status
//             : TaskStatus.PENDING;

//         const dailyTaskInstance = await prisma.dailyTaskInstance.create({
//             data: {
//                 taskDate: new Date(),
//                 defaultTaskId,
//                 priority: validPriority,
//                 status: validStatus,
//                 operators: {
//                     connect: operatorIds.map((id: string) => ({ id })),
//                 },
//             },
//         });

//         res.status(201).json({
//             success: true,
//             message: "Daily task instance created successfully",
//             data: dailyTaskInstance,
//         });

//     } catch (error) {
//         console.error("Error creating daily task instance:", error);
//         res.status(500).json({ error: "Failed to create daily task instance" });
//     }
// };

// const getTodayDailyTasksForAdmin = async (req: Request, res: Response) => {
//     try {
//         const adminId = req.user?.id;

//         if (!adminId) {
//             return res.status(401).json({ error: "Unauthorized. Admin ID missing." });
//         }

//         const todayStart = new Date();
//         todayStart.setHours(0, 0, 0, 0);

//         const tomorrowStart = new Date(todayStart);
//         tomorrowStart.setDate(tomorrowStart.getDate() + 1);

//         const tasks = await prisma.dailyTaskInstance.findMany({
//             where: {
//                 taskDate: {
//                     gte: todayStart,
//                     lt: tomorrowStart,
//                 },
//                 defaultTask: {
//                     adminId: adminId,
//                 },
//             },
//             include: {
//                 defaultTask: true,
//                 operators: {
//                     select: {
//                         id: true,
//                         name: true,
//                         email: true
//                     }
//                 }
//             },
//             orderBy: {
//                 taskDate: "asc",
//             },
//         });

//         res.status(200).json({
//             success: true,
//             count: tasks.length,
//             data: tasks,
//         });
//     } catch (error) {
//         console.error("Error fetching today’s daily tasks:", error);
//         res.status(500).json({ error: "Failed to fetch daily tasks" });
//     }
// };
// const getTodayTotalTasksCompletion = async (req: Request, res: Response) => {
//     try {
//         const adminId = req.user?.id;

//         if (!adminId) {
//             return res.status(401).json({ error: "Unauthorized. Admin ID missing." });
//         }

//         const todayStart = new Date();
//         todayStart.setHours(0, 0, 0, 0);

//         const tomorrowStart = new Date(todayStart);
//         tomorrowStart.setDate(tomorrowStart.getDate() + 1);

//         const completedDailyTasks = await prisma.dailyTaskInstance.count({
//             where: {
//                 status: TaskStatus.COMPLETED,
//                 taskDate: {
//                     gte: todayStart,
//                     lt: tomorrowStart,
//                 },
//                 defaultTask: {
//                     adminId,
//                 },
//             },
//         });

//         const completedNewTasks = await prisma.newTask.count({
//             where: {
//                 status: TaskStatus.COMPLETED,
//                 createdAt: {
//                     gte: todayStart,
//                     lt: tomorrowStart,
//                 },
//                 adminId,
//             },
//         });

//         res.status(200).json({
//             success: true,
//             data: {
//                 completedDailyTasks,
//                 completedNewTasks,
//                 totalCompletedTasks: completedDailyTasks + completedNewTasks
//             },
//         });
//     } catch (error) {
//         console.error("Error fetching today’s task completion:", error);
//         res.status(500).json({ error: "Failed to fetch today’s task completion." });
//     }
// };

// const getOperators = async (req: Request, res: Response) => {
//     try {
//         const operators = await prisma.operationTeamMember.findMany({
//             select: {
//                 id: true,
//                 name: true,
//             },
//             orderBy: {
//                 name: "asc",
//             },
//         });

//         res.status(200).json({
//             success: true,
//             count: operators.length,
//             data: operators,
//         });
//     } catch (error) {
//         console.error("Error fetching operators:", error);
//         res.status(500).json({ error: "Failed to fetch operators" });
//     }
// };



// const updateDailyTask = async (req: Request, res: Response) => {
//     try {
//         const dailyTaskId = req.params.id;
//         const { priority, operatorIds, status } = req.body;

//         if (!dailyTaskId) {
//             return res.status(400).json({ error: "Daily task ID is required" });
//         }

//         const existingTask = await prisma.dailyTaskInstance.findUnique({
//             where: { id: dailyTaskId },
//         });

//         if (!existingTask) {
//             return res.status(404).json({ error: "Daily task not found" });
//         }

//         const dataToUpdate: Prisma.DailyTaskInstanceUpdateInput = {};

//         if (priority) {
//             if (!Object.values(Priority).includes(priority)) {
//                 return res.status(400).json({ error: "Invalid priority value" });
//             }
//             dataToUpdate.priority = priority;
//         }

//         if (status) {
//             if (!Object.values(TaskStatus).includes(status)) {
//                 return res.status(400).json({ error: "Invalid status value" });
//             }
//             dataToUpdate.status = status;
//         }

//         if (Array.isArray(operatorIds)) {
//             dataToUpdate.operators = {
//                 set: operatorIds.map((id: string) => ({ id })),
//             };
//         }

//         const updatedTask = await prisma.dailyTaskInstance.update({
//             where: { id: dailyTaskId },
//             data: dataToUpdate,
//             include: {
//                 defaultTask: true,
//                 operators: true,
//             },
//         });

//         res.status(200).json({
//             success: true,
//             message: "Daily task updated successfully",
//             data: updatedTask,
//         });
//     } catch (error) {
//         console.error("Error updating daily task:", error);
//         res.status(500).json({ error: "Failed to update daily task" });
//     }
// };

// const deleteDailyTask = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({ error: "Task ID is required" });
//     }

//     const existingTask = await prisma.dailyTaskInstance.findUnique({
//       where: { id },
//     });

//     if (!existingTask) {
//       return res.status(404).json({ error: "Daily task not found" });
//     }

//     await prisma.dailyTaskInstance.delete({
//       where: { id },
//     });

//     res.status(200).json({
//       success: true,
//       message: "Daily task deleted successfully",
//     });
//   } catch (error) {
//     console.error("Error deleting daily task:", error);
//     res.status(500).json({ error: "Failed to delete daily task" });
//   }
// };


// const getNewTask = async (req: Request, res: Response) => {
//     try {
//         const adminId = req.user?.id;

//         if (!adminId) {
//             return res.status(401).json({ error: "Unauthorized. Admin ID missing." });
//         }

//         const today = startOfDay(new Date()); 

//         const tasks = await prisma.newTask.findMany({
//             where: {
//                 adminId: adminId,
//                 OR: [
//                     {
//                         assignedDate: {
//                             gte: today,
//                         },
//                     },
//                     {
//                         dueDate: {
//                             gte: today,
//                         },
//                     },
//                 ],
//             },
//             include: {
//                 operators: {
//                     select: {
//                         id: true,
//                         name: true,
//                     },
//                 },
//             },
//             orderBy: {
//                 assignedDate: "desc",
//             },
//         });

//         res.status(200).json({
//             success: true,
//             count: tasks.length,
//             data: tasks,
//         });
//     } catch (error) {
//         console.error("Error fetching new tasks:", error);
//         res.status(500).json({ error: "Failed to fetch new tasks" });
//     }
// };


// const updateNewTask = async (req: Request, res: Response) => {
//     try {
//         const taskId = req.params.id;
//         const { title, description, dueDate, priority, status, operatorIds } = req.body;

//         if (!taskId) {
//             return res.status(400).json({ error: "Task ID is required" });
//         }

//         const existingTask = await prisma.newTask.findUnique({
//             where: { id: taskId },
//         });

//         if (!existingTask) {
//             return res.status(404).json({ error: "New task not found" });
//         }

//         const dataToUpdate: Prisma.NewTaskUpdateInput = {};

//         if (title !== undefined) dataToUpdate.title = title;
//         if (description !== undefined) dataToUpdate.description = description;
//         if (dueDate !== undefined) dataToUpdate.dueDate = new Date(dueDate);

//         if (priority) {
//             if (!Object.values(Priority).includes(priority)) {
//                 return res.status(400).json({ error: "Invalid priority value" });
//             }
//             dataToUpdate.priority = priority;
//         }

//         if (status) {
//             if (!Object.values(TaskStatus).includes(status)) {
//                 return res.status(400).json({ error: "Invalid status value" });
//             }
//             dataToUpdate.status = status;
//         }

//         if (Array.isArray(operatorIds)) {
//             dataToUpdate.operators = {
//                 set: operatorIds.map((id: string) => ({ id })),
//             };
//         }

//         const updatedTask = await prisma.newTask.update({
//             where: { id: taskId },
//             data: dataToUpdate,
//             include: {
//                 operators: {
//                     select: { id: true, name: true },
//                 },
//             },
//         });

//         res.status(200).json({
//             success: true,
//             message: "New task updated successfully",
//             data: updatedTask,
//         });
//     } catch (error) {
//         console.error("Error updating new task:", error);
//         res.status(500).json({ error: "Failed to update new task" });
//     }
// };


// const deleteNewTask = async (req: Request, res: Response) => {
//     try {
//         const taskId = req.params.id;

//         if (!taskId) {
//             return res.status(400).json({ error: "Task ID is required in the URL" });
//         }

//         const existingTask = await prisma.newTask.findUnique({
//             where: { id: taskId },
//             include: {
//                 operators: true,
//             },
//         });

//         if (!existingTask) {
//             return res.status(404).json({ error: "New task not found" });
//         }

//         await prisma.newTask.update({
//             where: { id: taskId },
//             data: {
//                 operators: {
//                     set: [],
//                 },
//             },
//         });

//         await prisma.newTask.delete({
//             where: { id: taskId },
//         });

//         res.status(200).json({
//             success: true,
//             message: "New task deleted successfully and unassigned from all operators",
//         });
//     } catch (error) {
//         console.error("Error deleting new task:", error);
//         res.status(500).json({ error: "Failed to delete new task" });
//     }
// };

// const getTodayTotalTasksForAdmin = async (req: Request, res: Response) => {
//   try {
//     const today = new Date();

//     const start = startOfDay(today);
//     const end = endOfDay(today);

//     const [dailyTaskCount, newTaskCount] = await Promise.all([
//       prisma.dailyTaskInstance.count({
//         where: {
//           taskDate: {
//             gte: start,
//             lte: end,
//           },
//         },
//       }),
//       prisma.newTask.count({
//         where: {
//           createdAt: {
//             gte: start,
//             lte: end,
//           },
//         },
//       }),
//     ]);

//     const total = dailyTaskCount + newTaskCount;

//     return res.status(200).json({
//       success: true,
//       totalTasksToday: total,
//       dailyTaskCount,
//       newTaskCount,
//     });
//   } catch (error) {
//     console.error("Error fetching today's total tasks:", error);
//     return res.status(500).json({ error: "Failed to fetch today's total tasks" });
//   }
// };

// const getDailyStatusCount = async (req: Request, res: Response) => {
//   try {
//     const today = new Date();
//     const start = startOfDay(today);
//     const end = endOfDay(today);

//     const dailyStatusCounts = await prisma.dailyTaskInstance.groupBy({
//       by: ["status"],
//       where: {
//         taskDate: {
//           gte: start,
//           lte: end,
//         },
//       },
//       _count: {
//         status: true,
//       },
//     });

//     const newTaskStatusCounts = await prisma.newTask.groupBy({
//       by: ["status"],
//       where: {
//         createdAt: {
//           gte: start,
//           lte: end,
//         },
//       },
//       _count: {
//         status: true,
//       },
//     });

//     const totalStatusCounts = {
//       PENDING: 0,
//       IN_PROGRESS: 0,
//       COMPLETED: 0,
//     };

//     for (const entry of dailyStatusCounts) {
//       totalStatusCounts[entry.status as "PENDING" | "IN_PROGRESS" | "COMPLETED"] += entry._count.status;
//     }

//     for (const entry of newTaskStatusCounts) {
//       totalStatusCounts[entry.status as "PENDING" | "IN_PROGRESS" | "COMPLETED"] += entry._count.status;
//     }

//     return res.status(200).json({
//       success: true,
//       statusCounts: totalStatusCounts,
//     });

//   } catch (error) {
//     console.error("Error fetching daily status count:", error);
//     return res.status(500).json({ error: "Failed to fetch daily status count" });
//   }
// };

// const getPriorityCount = async (req: Request, res: Response) => {
//   try {
//     const today = new Date();
//     const start = startOfDay(today);
//     const end = endOfDay(today);

//     // Daily tasks grouped by priority
//     const dailyPriorityCounts = await prisma.dailyTaskInstance.groupBy({
//       by: ["priority"],
//       where: {
//         taskDate: {
//           gte: start,
//           lte: end,
//         },
//       },
//       _count: {
//         priority: true,
//       },
//     });

//     // New tasks grouped by priority
//     const newPriorityCounts = await prisma.newTask.groupBy({
//       by: ["priority"],
//       where: {
//         createdAt: {
//           gte: start,
//           lte: end,
//         },
//       },
//       _count: {
//         priority: true,
//       },
//     });

//     // Initialize totals
//     const totalPriorityCounts = {
//       LOW: 0,
//       MEDIUM: 0,
//       HIGH: 0,
//     };

//     // Add daily task counts
//     for (const entry of dailyPriorityCounts) {
//       totalPriorityCounts[entry.priority as "LOW" | "MEDIUM" | "HIGH"] += entry._count.priority;
//     }

//     // Add new task counts
//     for (const entry of newPriorityCounts) {
//       totalPriorityCounts[entry.priority as "LOW" | "MEDIUM" | "HIGH"] += entry._count.priority;
//     }

//     return res.status(200).json({
//       success: true,
//       priorityCounts: totalPriorityCounts,
//     });
//   } catch (error) {
//     console.error("Error fetching priority count:", error);
//     return res.status(500).json({ error: "Failed to fetch priority count" });
//   }
// };

// const getAssigneeWorkload = async (req: Request, res: Response) => {
//   try {
//     const today = new Date();
//     const start = startOfDay(today);
//     const end = endOfDay(today);

//     // Fetch all operators
//     const operators = await prisma.operationTeamMember.findMany({
//       select: {
//         id: true,
//         name: true,
//         assignedDailyTasks: {
//           where: {
//             taskDate: {
//               gte: start,
//               lte: end,
//             },
//           },
//           select: {
//             status: true,
//           },
//         },
//         assignedNewTasks: {
//           where: {
//             assignedDate: {
//               gte: start,
//               lte: end,
//             },
//           },
//           select: {
//             status: true,
//           },
//         },
//       },
//     });

//     const result = operators.map((operator) => {
//       const statusCount = {
//         PENDING: 0,
//         IN_PROGRESS: 0,
//         COMPLETED: 0,
//       };

//       [...operator.assignedDailyTasks, ...operator.assignedNewTasks].forEach(
//         (task) => {
//           statusCount[task.status]++;
//         }
//       );

//       const total =
//         statusCount.PENDING + statusCount.IN_PROGRESS + statusCount.COMPLETED;

//       return {
//         name: operator.name,
//         pending: statusCount.PENDING,
//         progress: statusCount.IN_PROGRESS,
//         completed: statusCount.COMPLETED,
//         total,
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       data: result,
//     });
//   } catch (error) {
//     console.error("Error fetching workload data:", error);
//     return res.status(500).json({ error: "Failed to fetch assignee workload" });
//   }
// };

// export { createDefaultTask, createNewTask, createDailyTask, getDefaultTasks , updateDefaultTask , deleteDefaultTask, getTodayDailyTasksForAdmin,getOperators,updateDailyTask,getNewTask,updateNewTask,deleteNewTask,getTodayTotalTasksForAdmin,getDailyStatusCount ,getPriorityCount,getAssigneeWorkload,deleteDailyTask ,getTodayTotalTasksCompletion};
