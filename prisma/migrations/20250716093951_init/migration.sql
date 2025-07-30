-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "admin" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskAssignedTotal" INTEGER NOT NULL DEFAULT 0,
    "taskCompletedTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT NOT NULL,

    CONSTRAINT "default_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_task_instances" (
    "id" TEXT NOT NULL,
    "taskDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "priority" "Priority" NOT NULL DEFAULT 'LOW',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "defaultTaskId" TEXT NOT NULL,

    CONSTRAINT "daily_task_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "priority" "Priority" NOT NULL DEFAULT 'LOW',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT NOT NULL,

    CONSTRAINT "new_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DailyTaskOperators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DailyTaskOperators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_NewTaskOperators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NewTaskOperators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_key" ON "admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "operation_email_key" ON "operation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "daily_task_instances_taskDate_defaultTaskId_key" ON "daily_task_instances"("taskDate", "defaultTaskId");

-- CreateIndex
CREATE INDEX "_DailyTaskOperators_B_index" ON "_DailyTaskOperators"("B");

-- CreateIndex
CREATE INDEX "_NewTaskOperators_B_index" ON "_NewTaskOperators"("B");

-- AddForeignKey
ALTER TABLE "default_tasks" ADD CONSTRAINT "default_tasks_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_task_instances" ADD CONSTRAINT "daily_task_instances_defaultTaskId_fkey" FOREIGN KEY ("defaultTaskId") REFERENCES "default_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_tasks" ADD CONSTRAINT "new_tasks_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DailyTaskOperators" ADD CONSTRAINT "_DailyTaskOperators_A_fkey" FOREIGN KEY ("A") REFERENCES "daily_task_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DailyTaskOperators" ADD CONSTRAINT "_DailyTaskOperators_B_fkey" FOREIGN KEY ("B") REFERENCES "operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NewTaskOperators" ADD CONSTRAINT "_NewTaskOperators_A_fkey" FOREIGN KEY ("A") REFERENCES "new_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NewTaskOperators" ADD CONSTRAINT "_NewTaskOperators_B_fkey" FOREIGN KEY ("B") REFERENCES "operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
