const { ChatOpenAI } = require("@langchain/openai");
const { ChatOllama } = require("@langchain/community/chat_models/ollama");
const { StructuredTool } = require("@langchain/core/tools");
const { AgentExecutor, createOpenAIAgent } = require("@langchain/core/agents");
const Logger = require('../Logger');
const DatabaseManager = require('../../database/DatabaseManager');

class LangChainAgentManager {
    constructor(logger, databaseManager) {
        this.logger = logger;
        this.db = databaseManager;
        this.agents = new Map(); // Store active agents
    }

    /**
     * Creates a new LangChain agent with the specified configuration
     * @param {Object} config - Agent configuration
     * @returns {Promise<Object>} Created agent information
     */
    async createAgent(config) {
        try {
            const { name, description, modelConfig = {}, tools = [] } = config;

            // Validate required fields
            if (!name) {
                throw new Error('Agent name is required');
            }

            // Create or get the LLM instance
            const llm = this.createLLMInstance(modelConfig);

            // Register the agent in the database
            const agentRecord = await this.db.registerAgent(
                name, 
                'langchain', 
                description || `LangChain agent: ${name}`, 
                { ...modelConfig, tools: tools.map(t => t.name) }
            );

            // Store agent instance
            const agentId = agentRecord.lastID;
            this.agents.set(agentId.toString(), {
                id: agentId,
                name,
                description,
                llm,
                tools,
                config: modelConfig,
                createdAt: new Date()
            });

            await this.logger.info('LangChain agent created', { 
                agentId, 
                name, 
                model: modelConfig.model || 'default' 
            }, 'langchain-agent');

            return {
                id: agentId,
                name,
                description,
                status: 'created',
                createdAt: new Date()
            };

        } catch (error) {
            await this.logger.error('Failed to create LangChain agent', { 
                error: error.message,
                config 
            }, 'langchain-agent');
            throw error;
        }
    }

    /**
     * Creates an LLM instance based on the configuration
     * @param {Object} modelConfig - Model configuration
     * @returns {ChatOpenAI|ChatOllama} LLM instance
     */
    createLLMInstance(modelConfig) {
        const model = modelConfig.model || "gpt-3.5-turbo";
        
        // Check if it's an Ollama model
        if (model.includes('qwen') || model.includes('llama') || model.includes('mistral')) {
            // Ollama model configuration
            return new ChatOllama({
                model: model,
                temperature: modelConfig.temperature || 0.7,
                baseUrl: modelConfig.baseURL || "http://localhost:11434",
                keepAlive: "5m"
            });
        } else {
            // OpenAI model configuration
            const config = {
                modelName: model,
                temperature: modelConfig.temperature || 0.7,
                apiKey: modelConfig.apiKey || process.env.OPENAI_API_KEY,
                configuration: {
                    baseURL: modelConfig.baseURL || undefined
                }
            };
            
            return new ChatOpenAI(config);
        }
    }

    /**
     * Executes an agent with the given input
     * @param {number} agentId - Agent ID
     * @param {Object} input - Input for the agent
     * @returns {Promise<Object>} Execution result
     */
    async executeAgent(agentId, input) {
        try {
            const agent = this.agents.get(agentId.toString());
            if (!agent) {
                throw new Error(`Agent with ID ${agentId} not found`);
            }

            // Generate a unique execution ID
            const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Log the start of execution
            await this.db.logAgentExecution(
                agentId, 
                executionId, 
                'running', 
                input
            );

            await this.logger.info('Starting agent execution', { 
                agentId, 
                executionId,
                input 
            }, 'langchain-agent');

            // Prepare tools for the agent
            const toolFunctions = agent.tools.map(tool => this.createToolFunction(tool));

            // Execute the agent directly with the LLM and tools
            const startTime = Date.now();
            // For now, we'll just use the LLM directly as a placeholder
            // In a real implementation, you'd use LangGraph or LangChain's agent creation
            const result = await agent.llm.invoke(typeof input === 'string' ? input : JSON.stringify(input));
            const executionTime = Date.now() - startTime;

            // Update execution record with results
            await this.db.updateAgentExecution(
                executionId,
                'completed',
                result,
                null
            );

            // Record execution metrics
            await this.db.recordAgentMetric(agentId, 'execution_time', executionTime);
            await this.db.recordAgentMetric(agentId, 'success_rate', 1);

            await this.logger.info('Agent execution completed', { 
                agentId, 
                executionId,
                executionTime,
                result: result 
            }, 'langchain-agent');

            return {
                executionId,
                result,
                executionTime,
                status: 'completed'
            };

        } catch (error) {
            // Update execution record with error
            const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await this.db.logAgentExecution(
                agentId, 
                executionId, 
                'failed', 
                input,
                null,
                error.message
            );

            // Record failure metrics
            await this.db.recordAgentMetric(agentId, 'success_rate', 0);
            await this.db.recordAgentMetric(agentId, 'error_count', 1);

            await this.logger.error('Agent execution failed', { 
                agentId, 
                executionId,
                error: error.message,
                input
            }, 'langchain-agent');

            throw error;
        }
    }

    /**
     * Creates a tool function from a tool definition
     * @param {Object} tool - Tool definition
     * @returns {FunctionTool} Tool function
     */
    createToolFunction(tool) {
        // Import FunctionTool from langchain
        const { FunctionTool } = require("@langchain/core/tools");
        
        return new FunctionTool({
            name: tool.name,
            description: tool.description,
            schema: tool.schema || {},
            func: async (input) => {
                try {
                    // Execute the tool with the given input
                    if (tool.handler && typeof tool.handler === 'function') {
                        return await tool.handler(input);
                    } else {
                        throw new Error(`Tool handler not defined for ${tool.name}`);
                    }
                } catch (error) {
                    throw new Error(`Error executing tool ${tool.name}: ${error.message}`);
                }
            }
        });
    }

    /**
     * Gets information about an agent
     * @param {number} agentId - Agent ID
     * @returns {Object|null} Agent information
     */
    getAgent(agentId) {
        return this.agents.get(agentId.toString()) || null;
    }

    /**
     * Lists all registered agents
     * @returns {Array} List of agents
     */
    listAgents() {
        return Array.from(this.agents.values());
    }

    /**
     * Updates an existing agent
     * @param {number} agentId - Agent ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated agent information
     */
    async updateAgent(agentId, updates) {
        try {
            const agent = this.agents.get(agentId.toString());
            if (!agent) {
                throw new Error(`Agent with ID ${agentId} not found`);
            }

            // Update the agent configuration
            if (updates.name) agent.name = updates.name;
            if (updates.description) agent.description = updates.description;
            if (updates.config) {
                agent.config = { ...agent.config, ...updates.config };
                // Recreate LLM instance with new config
                agent.llm = this.createLLMInstance(agent.config);
            }
            if (updates.tools) agent.tools = updates.tools;

            // Update in database
            await this.db.updateAgent(
                agentId,
                agent.name,
                'langchain',
                agent.description,
                { ...agent.config, tools: agent.tools.map(t => t.name) }
            );

            await this.logger.info('Agent updated', { 
                agentId, 
                updates 
            }, 'langchain-agent');

            return {
                id: agentId,
                name: agent.name,
                description: agent.description,
                status: 'updated'
            };

        } catch (error) {
            await this.logger.error('Failed to update agent', { 
                agentId,
                error: error.message,
                updates 
            }, 'langchain-agent');
            throw error;
        }
    }

    /**
     * Deletes an agent
     * @param {number} agentId - Agent ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteAgent(agentId) {
        try {
            if (this.agents.has(agentId.toString())) {
                this.agents.delete(agentId.toString());
            }

            await this.db.deleteAgent(agentId);

            await this.logger.info('Agent deleted', { agentId }, 'langchain-agent');

            return true;

        } catch (error) {
            await this.logger.error('Failed to delete agent', { 
                agentId,
                error: error.message
            }, 'langchain-agent');
            throw error;
        }
    }

    /**
     * Gets execution history for an agent
     * @param {number} agentId - Agent ID
     * @param {number} limit - Number of executions to return
     * @returns {Promise<Array>} Execution history
     */
    async getAgentExecutions(agentId, limit = 50) {
        return await this.db.getAgentExecutions(agentId, limit);
    }

    /**
     * Gets metrics for an agent
     * @param {number} agentId - Agent ID
     * @param {string} metricName - Optional metric name
     * @param {number} hours - Hours to look back
     * @returns {Promise<Array>} Metrics
     */
    async getAgentMetrics(agentId, metricName = null, hours = 24) {
        return await this.db.getAgentMetrics(agentId, metricName, hours);
    }
}

module.exports = { LangChainAgentManager };