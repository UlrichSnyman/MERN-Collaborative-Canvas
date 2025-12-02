import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (url, token) => {
  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    const connect = () => {
      // Don't attempt connection if component is unmounted or already connecting
      if (!isMountedRef.current || isConnectingRef.current) return;

      isConnectingRef.current = true;

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          isConnectingRef.current = false;
          if (isMountedRef.current && wsRef.current === ws) {
            console.log('WebSocket connected');
            setIsConnected(true);
            retryCountRef.current = 0; // Reset retry count on successful connection
            
            // Send authentication message
            ws.send(JSON.stringify({
              type: 'AUTH',
              token: token
            }));
          }
        };

        ws.onmessage = (event) => {
          if (isMountedRef.current && wsRef.current === ws) {
            setLastMessage(event.data);
          }
        };

        ws.onclose = () => {
          isConnectingRef.current = false;
          if (isMountedRef.current && wsRef.current === ws) {
            console.log('WebSocket disconnected');
            setIsConnected(false);
            
            // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
            const delay = Math.min(Math.pow(2, retryCountRef.current) * 1000, 30000);
            retryCountRef.current++;
            
            timeoutRef.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = (error) => {
          isConnectingRef.current = false;
          if (isMountedRef.current && wsRef.current === ws) {
            console.error('WebSocket error:', error);
            setIsConnected(false);
          }
        };
      } catch (error) {
        isConnectingRef.current = false;
        if (isMountedRef.current) {
          console.error('Failed to connect WebSocket:', error);
          setIsConnected(false);
          
          // Exponential backoff on connection failure
          const delay = Math.min(Math.pow(2, retryCountRef.current) * 1000, 30000);
          retryCountRef.current++;
          
          timeoutRef.current = setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Only close if the WebSocket is not already closing
      if (wsRef.current && wsRef.current.readyState < 2) {
        wsRef.current.close();
      }
    };
  }, [url, token]);

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    }
  };

  return {
    sendMessage,
    lastMessage,
    isConnected
  };
};