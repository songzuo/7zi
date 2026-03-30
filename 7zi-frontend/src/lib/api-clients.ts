/**
 * API Clients
 *
 * 集中管理所有前端 API 客户端函数
 * 每个模块的客户端函数从这个文件统一导出
 */

// Re-export room API clients
export { roomsClient, RoomWebSocket, createRoomWebSocket } from './api/rooms/client';

// Re-export room store for server-side usage
export { roomStore } from './api/rooms/store';
