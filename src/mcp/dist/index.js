/**
 * 7zi MCP Server - Main Entry Point
 * 7zi AI 团队管理平台 MCP Server
 * 暴露 Dashboard、任务管理、AI 团队等核心能力
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerDashboardTools } from './tools/dashboard.js';
import { registerTaskTools } from './tools/tasks.js';
import { registerAgentTools } from './tools/agents.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
// ============================================================================
// MCP Server 配置
// ============================================================================
const SERVER_CONFIG = {
    name: '7zi-team',
    version: '1.0.0',
    description: '7zi AI 团队管理平台 MCP Server - 暴露 Dashboard、任务管理、AI 团队等核心能力',
};
// ============================================================================
// 创建 MCP Server 实例
// ============================================================================
const server = new McpServer({
    name: SERVER_CONFIG.name,
    version: SERVER_CONFIG.version,
});
console.error('[7zi MCP] Initializing server...');
// ============================================================================
// 注册所有能力
// ============================================================================
// 1. 注册 Tools (工具)
registerDashboardTools(server);
console.error('[7zi MCP] Dashboard tools registered');
registerTaskTools(server);
console.error('[7zi MCP] Task tools registered');
registerAgentTools(server);
console.error('[7zi MCP] Agent tools registered');
// 2. 注册 Resources (资源)
registerResources(server);
console.error('[7zi MCP] Resources registered');
// 3. 注册 Prompts (提示模板)
registerPrompts(server);
console.error('[7zi MCP] Prompts registered');
// ============================================================================
// 错误处理
// ============================================================================
process.on('uncaughtException', (error) => {
    console.error('[7zi MCP] Uncaught exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[7zi MCP] Unhandled rejection at:', promise, 'reason:', reason);
});
// ============================================================================
// 启动 Server
// ============================================================================
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[7zi MCP] Server started successfully');
    console.error(`[7zi MCP] Server: ${SERVER_CONFIG.name} v${SERVER_CONFIG.version}`);
    console.error('[7zi MCP] Transport: stdio');
    console.error('[7zi MCP] Capabilities: tools, resources, prompts');
    console.error('[7zi MCP] Ready to accept requests');
}
main().catch((error) => {
    console.error('[7zi MCP] Fatal error in main():', error);
    process.exit(1);
});
// ============================================================================
// 导出 Server 实例
// ============================================================================
export { server };
export default server;
//# sourceMappingURL=index.js.map