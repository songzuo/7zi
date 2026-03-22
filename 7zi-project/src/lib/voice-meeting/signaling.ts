/**
 * Voice Meeting Signaling
 * 语音会议信令处理
 */

import type { Socket, Server } from 'socket.io';

/**
 * Setup voice meeting handlers
 */
export function setupVoiceMeetingHandlers(ioServer: Server): void {
  ioServer.on('connection', (socket: Socket) => {
    socket.on('voice:join', (data) => {
      console.log('Voice join:', data);
    });

    socket.on('voice:leave', (data) => {
      console.log('Voice leave:', data);
    });

    socket.on('voice:signal', (data) => {
      console.log('Voice signal:', data);
    });

    socket.on('voice:offer', (data) => {
      console.log('Voice offer:', data);
    });

    socket.on('voice:answer', (data) => {
      console.log('Voice answer:', data);
    });

    socket.on('voice:ice-candidate', (data) => {
      console.log('Voice ICE candidate:', data);
    });
  });
}
