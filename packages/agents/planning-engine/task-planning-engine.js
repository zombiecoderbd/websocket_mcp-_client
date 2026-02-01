/**
 * Task Planning and Execution Engine
 * Advanced AI Agent Architecture - Planning and Execution System
 * 
 * Implements SMART goal generation, task breakdown, dependency mapping,
 * and execution monitoring with client confirmation workflow.
 */

class TaskPlanningEngine {
    constructor(config = {}) {
        this.config = {
            defaultPriority: config.defaultPriority || 'medium',
            defaultDeadline: config.defaultDeadline || '7 days',
            enableClientConfirmation: config.enableClientConfirmation !== false,
            maxSubtasksPerTask: config.maxSubtasksPerTask || 10,
            enableDependencyMapping: config.enableDependencyMapping !== false,
            allowHumanReview: config.allowHumanReview !== false
        };

        this.tasks = new Map();
        this.taskQueue = [];
        this.executionHistory = [];
        this.dependencyGraph = new Map();
        this.isExecuting = false;
    }

    /**
     * Generate a SMART goal from user input
     */
    generateSMARTGoal(description, context = {}) {
        const smartGoal = {
            id: this.generateId(),
            description: description,
            specific: this.makeSpecific(description),
            measurable: this.makeMeasurable(description),
            achievable: this.assessAchievability(description, context),
            relevant: this.assessRelevance(description, context),
            timeBound: this.makeTimeBound(description, context),
            priority: context.priority || this.config.defaultPriority,
            deadline: context.deadline || this.addDaysToDate(new Date(), 7),
            createdAt: new Date().toISOString(),
            status: 'planned',
            metadata: {
                ...context,
                generator: 'ZombieCoder Task Planning Engine',
                version: '1.0'
            }
        };

        return smartGoal;
    }

    makeSpecific(description) {
        // Make the goal more specific based on context
        return description;
    }

    makeMeasurable(description) {
        // Define metrics to measure progress
        return `Success criteria for: ${description}`;
    }

    assessAchievability(description, context) {
        // Assess feasibility based on available resources and context
        return true; // Assume achievable initially
    }

    assessRelevance(description, context) {
        // Assess relevance to current objectives
        return true; // Assume relevant initially
    }

    makeTimeBound(description, context) {
        // Define timeline constraints
        return context.deadline || this.addDaysToDate(new Date(), 7);
    }

    addDaysToDate(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result.toISOString();
    }

    /**
     * Break down a task into subtasks
     */
    async breakDownTask(task, context = {}) {
        const subtasks = [];

        // Analyze the task and create subtasks based on its nature
        if (task.description.toLowerCase().includes('code') || 
            task.description.toLowerCase().includes('implement')) {
            subtasks.push(...this.createCodingSubtasks(task));
        } else if (task.description.toLowerCase().includes('document') ||
                   task.description.toLowerCase().includes('write')) {
            subtasks.push(...this.createDocumentationSubtasks(task));
        } else if (task.description.toLowerCase().includes('test') ||
                   task.description.toLowerCase().includes('verify')) {
            subtasks.push(...this.createTestingSubtasks(task));
        } else {
            // Generic task breakdown
            subtasks.push(...this.createGenericSubtasks(task));
        }

        // Add dependencies if enabled
        if (this.config.enableDependencyMapping) {
            this.createDependencies(subtasks);
        }

        return subtasks;
    }

    createCodingSubtasks(task) {
        return [
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Analyze requirements for ${task.description}`,
                priority: 'high',
                estimatedTime: '30 mins',
                dependencies: [],
                status: 'pending',
                type: 'analysis'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Design solution for ${task.description}`,
                priority: 'high',
                estimatedTime: '1 hour',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'design'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Implement ${task.description}`,
                priority: 'high',
                estimatedTime: '2-4 hours',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'implementation'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Test ${task.description}`,
                priority: 'medium',
                estimatedTime: '1 hour',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'testing'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Document ${task.description}`,
                priority: 'low',
                estimatedTime: '30 mins',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'documentation'
            }
        ];
    }

    createDocumentationSubtasks(task) {
        return [
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Research ${task.description} requirements`,
                priority: 'high',
                estimatedTime: '30 mins',
                dependencies: [],
                status: 'pending',
                type: 'research'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Outline ${task.description}`,
                priority: 'high',
                estimatedTime: '1 hour',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'outline'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Write ${task.description}`,
                priority: 'high',
                estimatedTime: '2-3 hours',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'writing'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Review ${task.description}`,
                priority: 'medium',
                estimatedTime: '1 hour',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'review'
            }
        ];
    }

    createTestingSubtasks(task) {
        return [
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Define test cases for ${task.description}`,
                priority: 'high',
                estimatedTime: '1 hour',
                dependencies: [],
                status: 'pending',
                type: 'test-design'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Set up test environment for ${task.description}`,
                priority: 'high',
                estimatedTime: '1 hour',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'setup'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Execute tests for ${task.description}`,
                priority: 'high',
                estimatedTime: '2 hours',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'execution'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Analyze test results for ${task.description}`,
                priority: 'medium',
                estimatedTime: '1 hour',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'analysis'
            }
        ];
    }

    createGenericSubtasks(task) {
        return [
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Plan ${task.description}`,
                priority: 'high',
                estimatedTime: '1 hour',
                dependencies: [],
                status: 'pending',
                type: 'planning'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Execute ${task.description}`,
                priority: 'high',
                estimatedTime: '2-4 hours',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'execution'
            },
            {
                id: this.generateId(),
                parentId: task.id,
                description: `Review ${task.description}`,
                priority: 'medium',
                estimatedTime: '1 hour',
                dependencies: [this.getLastSubtaskId()],
                status: 'pending',
                type: 'review'
            }
        ];
    }

    createDependencies(subtasks) {
        // Create dependency mappings between subtasks
        for (let i = 1; i < subtasks.length; i++) {
            const prevTask = subtasks[i - 1];
            const currTask = subtasks[i];
            
            // Map dependency: current task depends on previous task
            if (!this.dependencyGraph.has(currTask.id)) {
                this.dependencyGraph.set(currTask.id, []);
            }
            this.dependencyGraph.get(currTask.id).push(prevTask.id);
        }
    }

    getLastSubtaskId() {
        // This is a simplified implementation - in a real system, 
        // we'd track the last generated subtask ID properly
        return `subtask_${Date.now()}`;
    }

    /**
     * Create a new task with planning
     */
    async createTask(description, context = {}) {
        // Generate SMART goal
        const smartGoal = this.generateSMARTGoal(description, context);
        
        // Break down into subtasks
        const subtasks = await this.breakDownTask(smartGoal, context);
        
        // Create task object
        const task = {
            ...smartGoal,
            subtasks: subtasks,
            progress: {
                completed: 0,
                total: subtasks.length,
                percentage: 0
            },
            executionPlan: this.createExecutionPlan(smartGoal, subtasks)
        };

        // Store task
        this.tasks.set(task.id, task);
        
        // Add to queue
        this.taskQueue.push(task.id);
        
        return task;
    }

    /**
     * Create execution plan for the task
     */
    createExecutionPlan(task, subtasks) {
        return {
            taskId: task.id,
            startTime: null,
            endTime: null,
            executor: null,
            subtaskOrder: subtasks.map(st => st.id),
            checkpoints: this.createCheckpoints(subtasks),
            rollbackPlan: this.createRollbackPlan(task, subtasks)
        };
    }

    createCheckpoints(subtasks) {
        // Create checkpoints at key stages
        return subtasks.filter((_, idx) => idx % 2 === 0).map(st => ({
            taskId: st.id,
            description: `Checkpoint: ${st.description}`,
            completed: false
        }));
    }

    createRollbackPlan(task, subtasks) {
        return {
            description: `Rollback plan for ${task.description}`,
            steps: subtasks.reverse().map(st => ({
                description: `Undo ${st.description}`,
                executable: true
            }))
        };
    }

    /**
     * Request client confirmation for task execution
     */
    async requestClientConfirmation(task) {
        if (!this.config.enableClientConfirmation) {
            return true; // Auto-confirm if not enabled
        }

        // In a real implementation, this would send a notification to the client
        console.log(`🔔 CLIENT CONFIRMATION REQUIRED:`);
        console.log(`   Task: ${task.description}`);
        console.log(`   Subtasks: ${task.subtasks.length}`);
        console.log(`   Estimated time: ${this.estimateTime(task)}`);
        console.log(`   Priority: ${task.priority}`);
        console.log(`   Deadline: ${task.deadline}`);
        console.log(`   Do you want to proceed with this plan?`);

        // For testing purposes, we'll auto-confirm
        return true;
    }

    estimateTime(task) {
        let totalMinutes = 0;
        task.subtasks.forEach(st => {
            const timeMatch = st.estimatedTime.match(/(\d+)(?:-(\d+))?/);
            if (timeMatch) {
                const minTime = parseInt(timeMatch[1]);
                const maxTime = timeMatch[2] ? parseInt(timeMatch[2]) : minTime;
                totalMinutes += (minTime + maxTime) / 2; // Average
            }
        });
        return `${Math.ceil(totalMinutes / 60)} hours`;
    }

    /**
     * Execute a task
     */
    async executeTask(taskId) {
        if (this.isExecuting) {
            throw new Error('Another task is currently executing');
        }

        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Request client confirmation if enabled
        const confirmed = await this.requestClientConfirmation(task);
        if (!confirmed) {
            task.status = 'cancelled';
            return { status: 'cancelled', message: 'Task cancelled by client' };
        }

        this.isExecuting = true;
        const executionPlan = task.executionPlan;
        executionPlan.startTime = new Date().toISOString();
        executionPlan.executor = 'ZombieCoder Agent';

        try {
            console.log(`🚀 Starting execution of task: ${task.description}`);
            
            // Execute subtasks in order respecting dependencies
            for (const subtaskId of executionPlan.subtaskOrder) {
                const subtask = task.subtasks.find(st => st.id === subtaskId);
                if (subtask) {
                    await this.executeSubtask(subtask, task);
                }
            }

            // Mark task as completed
            task.status = 'completed';
            task.progress.completed = task.progress.total;
            task.progress.percentage = 100;
            executionPlan.endTime = new Date().toISOString();

            // Add to execution history
            this.executionHistory.push({
                ...task,
                completedAt: executionPlan.endTime,
                executionDuration: this.calculateDuration(executionPlan.startTime, executionPlan.endTime)
            });

            console.log(`✅ Task completed: ${task.description}`);

            return { status: 'completed', task: task };

        } catch (error) {
            console.error(`❌ Task failed: ${task.description}`, error);
            task.status = 'failed';
            executionPlan.endTime = new Date().toISOString();
            
            // Add failed task to history
            this.executionHistory.push({
                ...task,
                completedAt: executionPlan.endTime,
                error: error.message,
                executionDuration: this.calculateDuration(executionPlan.startTime, executionPlan.endTime)
            });

            return { status: 'failed', error: error.message, task: task };

        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Execute a single subtask
     */
    async executeSubtask(subtask, parentTask) {
        console.log(`  📋 Executing subtask: ${subtask.description}`);
        
        // Check dependencies
        const deps = this.dependencyGraph.get(subtask.id) || [];
        for (const depId of deps) {
            const depTask = parentTask.subtasks.find(st => st.id === depId);
            if (depTask && depTask.status !== 'completed') {
                throw new Error(`Dependency not met: ${depTask.description}`);
            }
        }

        // Simulate execution
        await this.simulateWork(subtask.estimatedTime);
        
        // Mark as completed
        subtask.status = 'completed';
        subtask.completedAt = new Date().toISOString();
        
        // Update parent task progress
        parentTask.progress.completed += 1;
        parentTask.progress.percentage = Math.round(
            (parentTask.progress.completed / parentTask.progress.total) * 100
        );

        // Update checkpoints
        const checkpoint = parentTask.executionPlan.checkpoints.find(cp => cp.taskId === subtask.id);
        if (checkpoint) {
            checkpoint.completed = true;
        }

        console.log(`  ✅ Subtask completed: ${subtask.description}`);
    }

    /**
     * Simulate work (in a real implementation, this would perform actual work)
     */
    async simulateWork(estimatedTime) {
        // Convert estimated time to milliseconds for simulation
        const timeMatch = estimatedTime.match(/(\d+)/);
        const minutes = timeMatch ? parseInt(timeMatch[0]) : 30;
        const milliseconds = minutes * 60 * 1000;
        
        // Simulate async work
        return new Promise(resolve => setTimeout(resolve, Math.min(milliseconds, 2000))); // Max 2 seconds for testing
    }

    calculateDuration(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffMs = endDate - startDate;
        const diffMins = Math.round(diffMs / 60000);
        return `${diffMins} minutes`;
    }

    /**
     * Get task status
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }

    /**
     * Get all tasks
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    /**
     * Get execution history
     */
    getExecutionHistory() {
        return [...this.executionHistory];
    }

    /**
     * Cancel a task
     */
    cancelTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        if (task.status === 'executing') {
            throw new Error(`Cannot cancel task ${taskId} while executing`);
        }

        task.status = 'cancelled';
        return { status: 'cancelled', task: task };
    }

    /**
     * Pause task execution
     */
    pauseTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        if (task.status === 'executing') {
            task.status = 'paused';
            return { status: 'paused', task: task };
        }

        throw new Error(`Task ${taskId} is not currently executing`);
    }

    /**
     * Resume task execution
     */
    async resumeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        if (task.status === 'paused') {
            // Resume execution
            return await this.executeTask(taskId);
        }

        throw new Error(`Task ${taskId} is not paused`);
    }

    generateId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get planning engine status
     */
    getStatus() {
        return {
            totalTasks: this.tasks.size,
            queuedTasks: this.taskQueue.length,
            executing: this.isExecuting,
            completedTasks: this.executionHistory.length,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = TaskPlanningEngine;