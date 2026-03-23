/**
 * WebSocket Enhanced Collaboration Hook (Patch)
 *
 * This file contains the enhanced version with reconnection manager integration
 * Apply these changes to useCollaboration.ts
 */

// Add these imports to the existing imports in useCollaboration.ts:

/**
import {
  ReconnectionManager,
  createReconnectionManager,
  type ReconnectionConfig,
} from './reconnection';
*/

// Replace the reconnection-related refs with this:

/**
  // Refs - Replacing old reconnection refs with ReconnectionManager
  const socketRef = useRef<Socket | null>(null);
  const currentRoomRef = useRef<string | undefined>(initialRoomId);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectionManagerRef = useRef<ReconnectionManager | null>(null);
*/

// Replace the old reconnection functions with this:

/**
  // Initialize ReconnectionManager
  useEffect(() => {
    if (!reconnectionManagerRef.current) {
      reconnectionManagerRef.current = createReconnectionManager({
        ...config.reconnectionConfig,
        reconnectFn: () => {
          connectRef.current?.();
        },
        onReconnect: () => {
          logger.info('Reconnection successful', { userId, userName });
          reconnectAttemptsRef.current = 0;

          // Auto-join room if configured
          if (currentRoomRef.current && roomType && initialDocumentId) {
            socketRef.current?.emit('room:join', {
              roomId: currentRoomRef.current,
              type: roomType,
              documentId: initialDocumentId,
            });
          }
        },
        onDisconnect: (reason) => {
          logger.info('Disconnected via ReconnectionManager', { reason });
        },
        onError: (error) => {
          logger.error('Reconnection error', { error });
          setError(error);
        },
      });
    }

    return () => {
      reconnectionManagerRef.current = null;
    };
  }, [userId, userName, roomType, initialDocumentId, config.reconnectionConfig]);

  // Replace the connect function with this enhanced version:
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      logger.warn('WebSocket already connected');
      return;
    }

    updateState('connecting');
    setError(null);

    try {
      const socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection manually
        timeout: 10000,
      });

      socketRef.current = socket;

      // Connection established
      socket.on('connect', () => {
        logger.info('WebSocket connected', { userId, userName });
        updateState('connected');

        // Notify reconnection manager
        reconnectionManagerRef.current?.handleConnected();

        // Auto-join room if configured
        if (currentRoomRef.current && roomType && initialDocumentId) {
          socket.emit('room:join', {
            roomId: currentRoomRef.current,
            type: roomType,
            documentId: initialDocumentId,
          });
        }
      });

      // Connection error
      socket.on('connect_error', (err) => {
        logger.error('WebSocket connection error', { error: err });
        const error = new Error(err.message || 'Connection error');
        setError(error);
        updateState('error');

        // Notify reconnection manager
        reconnectionManagerRef.current?.handleError(error);
      });

      // Disconnect
      socket.on('disconnect', (reason) => {
        logger.info('WebSocket disconnected', { reason });
        updateState('disconnected');
        setIsInRoom(false);

        // Notify reconnection manager
        reconnectionManagerRef.current?.handleDisconnect(reason);
      });

      // ... rest of the socket event handlers remain the same ...

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      updateState('error');
      logger.error('Failed to create WebSocket connection', { error });
    }
  }, [url, token, userId, userName, roomType, initialDocumentId, updateState]);

  // Replace the reconnect function with this:
  const reconnect = useCallback(() => {
    reconnectionManagerRef.current?.reconnect();
  }, []);

  // Add these new properties to the return object:

/**
  return {
    // ... existing state and actions ...

    // New reconnection management
    reconnectionState: reconnectionManagerRef.current?.getState(),
    getNextAttemptCountdown: () => reconnectionManagerRef.current?.getNextAttemptCountdown() || 0,
    disableReconnection: () => reconnectionManagerRef.current?.disableReconnection(),
    enableReconnection: () => reconnectionManagerRef.current?.enableReconnection(),

    // ... rest of return ...
  };
*/

// Example of how to use the enhanced features:

/**
  // In your component:

  const {
    connectionState,
    isConnected,
    reconnect,
    reconnectionState,
    getNextAttemptCountdown,
  } = useCollaboration(config);

  // Display reconnection status
  const showReconnecting = connectionState === 'reconnecting';
  const countdown = getNextAttemptCountdown();

  return (
    <div>
      {showReconnecting && (
        <div className="reconnecting-indicator">
          Reconnecting in {countdown}s... (Attempt {reconnectionState?.attemptNumber})
        </div>
      )}
    </div>
  );
*/
