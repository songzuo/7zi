/**
 * Socket.io Mock for WebRTC Testing
 * @description Provides mock implementations for socket.io-client to test WebRTC meetings
 */

import { vi, type MockedFunction } from "vitest";

/**
 * Socket event listener type
 */
type EventListener = (...args: unknown[]) => void;

/**
 * Mock Socket implementation
 */
export interface MockSocket {
  connected: boolean;
  id: string | undefined;
  on: MockedFunction<(event: string, listener: EventListener) => this>;
  off: MockedFunction<(event: string, listener: EventListener) => this>;
  emit: MockedFunction<(event: string, ...args: unknown[]) => void>;
  connect: MockedFunction<() => void>;
  disconnect: MockedFunction<() => void>;
  once: MockedFunction<(event: string, listener: EventListener) => this>;
  removeAllListeners: MockedFunction<(event?: string) => void>;
  // Internal test storage
  __emittedEvents?: Array<{ event: string; args: unknown[] }>;
}

/**
 * Internal event store for mock socket
 */
interface EventStore {
  [event: string]: EventListener[];
}

/**
 * Create a mock socket instance
 */
export function createMockSocket(options: {
  connected?: boolean;
  id?: string;
} = {}): MockSocket {
  const eventStore: EventStore = {};
  const socket = {
    connected: options.connected ?? false,
    id: options.id ?? "mock-socket-id",

    /**
     * Register an event listener
     */
    on: vi.fn((event: string, listener: EventListener) => {
      if (!eventStore[event]) {
        eventStore[event] = [];
      }
      eventStore[event].push(listener);
      return socket;
    }),

    /**
     * Remove an event listener
     */
    off: vi.fn((event: string, listener: EventListener) => {
      if (eventStore[event]) {
        eventStore[event] = eventStore[event].filter((l) => l !== listener);
      }
      return socket;
    }),

    /**
     * Emit an event to the server
     */
    emit: vi.fn((event: string, ...args: unknown[]) => {
      // Store the emitted event for verification
      socket.__emittedEvents = socket.__emittedEvents || [];
      socket.__emittedEvents.push({ event, args });
    }),

    /**
     * Connect to the server
     */
    connect: vi.fn(() => {
      socket.connected = true;
      // Trigger connect event
      if (eventStore.connect) {
        eventStore.connect.forEach((listener) => listener());
      }
    }),

    /**
     * Disconnect from the server
     */
    disconnect: vi.fn(() => {
      socket.connected = false;
      // Trigger disconnect event
      if (eventStore.disconnect) {
        eventStore.disconnect.forEach((listener) => listener());
      }
    }),

    /**
     * Register a one-time event listener
     */
    once: vi.fn((event: string, listener: EventListener) => {
      if (!eventStore[event]) {
        eventStore[event] = [];
      }
      const wrapper = (...args: unknown[]) => {
        listener(...args);
        // Remove after first call
        if (eventStore[event]) {
          eventStore[event] = eventStore[event].filter((l) => l !== wrapper);
        }
      };
      eventStore[event].push(wrapper);
      return socket;
    }),

    /**
     * Remove all listeners or listeners for a specific event
     */
    removeAllListeners: vi.fn((event?: string) => {
      if (event) {
        delete eventStore[event];
      } else {
        Object.keys(eventStore).forEach((key) => delete eventStore[key]);
      }
    }),
  } as unknown as MockSocket;

  // Add internal event storage for testing
  (socket as any).__eventStore = eventStore;

  return socket;
}

/**
 * Simulate receiving an event from the server
 */
export function triggerSocketEvent(
  socket: MockSocket,
  event: string,
  ...args: unknown[]
): void {
  const eventStore = (socket as any).__eventStore as EventStore;
  if (eventStore[event]) {
    eventStore[event].forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in socket event listener for "${event}":`, error);
      }
    });
  }
}

/**
 * Get events emitted by the socket
 */
export function getEmittedEvents(socket: MockSocket): Array<{
  event: string;
  args: unknown[];
}> {
  return (socket as any).__emittedEvents || [];
}

/**
 * Clear emitted events log
 */
export function clearEmittedEvents(socket: MockSocket): void {
  (socket as any).__emittedEvents = [];
}

/**
 * Mock factory for socket.io-client io() function
 */
export function createMockSocketIO(options: {
  connected?: boolean;
  id?: string;
} = {}): MockedFunction<(url: string, opts?: Record<string, unknown>) => MockSocket> {
  return vi.fn((url: string, opts?: Record<string, unknown>) => {
    return createMockSocket(options);
  });
}

/**
 * Default mock socket options for WebRTC tests
 */
export const DEFAULT_WEBRTC_SOCKET_OPTIONS = {
  connected: false,
  id: "test-socket-id",
} as const;

/**
 * Mock io() function with default WebRTC configuration
 */
export const mockIO = createMockSocketIO(DEFAULT_WEBRTC_SOCKET_OPTIONS);

/**
 * Create a mock socket for WebRTC meeting tests
 */
export function createWebRTCTestSocket(): MockSocket {
  const socket = createMockSocket(DEFAULT_WEBRTC_SOCKET_OPTIONS);

  // Return socket with bound trigger function capability
  return socket;
}

/**
 * WebRTC meeting event data types
 */
export interface WebRTCMeetingEvents {
  "join-room": {
    roomId: string;
    participants: Array<{
      id: string;
      name: string;
      audioEnabled: boolean;
      isSpeaking: boolean;
      joinedAt: Date;
    }>;
  };
  "user-joined": {
    userId: string;
    userName: string;
  };
  "user-left": {
    userId: string;
  };
  "user-audio-changed": {
    userId: string;
    enabled: boolean;
  };
  "signal": {
    userId: string;
    signal: RTCSessionDescriptionInit | RTCIceCandidate;
  };
  error: {
    message: string;
    code?: number;
  };
}

/**
 * Trigger a specific WebRTC meeting event
 */
export function triggerWebRTCEvent<K extends keyof WebRTCMeetingEvents>(
  socket: MockSocket,
  event: K,
  data: WebRTCMeetingEvents[K],
): void {
  triggerSocketEvent(socket, event, data);
}

/**
 * Create mock participants list
 */
export function createMockParticipants(count: number): Array<{
  id: string;
  name: string;
  audioEnabled: boolean;
  isSpeaking: boolean;
  joinedAt: Date;
}> {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    name: `Test User ${i + 1}`,
    audioEnabled: true,
    isSpeaking: false,
    joinedAt: new Date(),
  }));
}

/**
 * Verify a specific event was emitted
 */
export function verifyEventEmitted(
  socket: MockSocket,
  event: string,
  args?: unknown[],
): boolean {
  const emitted = getEmittedEvents(socket);
  const matching = emitted.filter((e) => e.event === event);
  if (!args) {
    return matching.length > 0;
  }
  return matching.some((e) => JSON.stringify(e.args) === JSON.stringify(args));
}

/**
 * Count how many times an event was emitted
 */
export function countEventEmitted(socket: MockSocket, event: string): number {
  const emitted = getEmittedEvents(socket);
  return emitted.filter((e) => e.event === event).length;
}
