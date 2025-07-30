-- DropForeignKey
ALTER TABLE "daily_task_instances" DROP CONSTRAINT "daily_task_instances_defaultTaskId_fkey";

-- AddForeignKey
ALTER TABLE "daily_task_instances" ADD CONSTRAINT "daily_task_instances_defaultTaskId_fkey" FOREIGN KEY ("defaultTaskId") REFERENCES "default_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
