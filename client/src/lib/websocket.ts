import { useEffect, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  title: string;
  description?: string;
  data?: any;
}

export function useWebSocket(companyId: string | null, onMessage: (message: WebSocketMessage) => void) {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      if (ws.current) {
        ws.current.send(JSON.stringify({
          type: 'join_company',
          companyId: companyId
        }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage(message);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [companyId, onMessage]);

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { sendMessage };
}
