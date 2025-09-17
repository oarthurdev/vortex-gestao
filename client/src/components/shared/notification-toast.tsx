import { useEffect } from "react";
import { X, Check, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationToastProps {
  show: boolean;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  title?: string;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function NotificationToast({
  show,
  message,
  type = "info",
  title,
  onClose,
  autoClose = true,
  duration = 5000,
}: NotificationToastProps) {
  useEffect(() => {
    if (show && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, autoClose, duration, onClose]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <Check className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-700";
      case "error":
        return "bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-700";
      case "warning":
        return "bg-orange-100 dark:bg-orange-900 border-orange-200 dark:border-orange-700";
      default:
        return "bg-card border-border";
    }
  };

  return (
    <div 
      className={cn(
        "fixed top-4 right-4 z-50 rounded-lg shadow-lg p-4 max-w-sm w-full border transition-all duration-300 ease-in-out",
        getBackgroundColor(),
        show ? "animate-in slide-in-from-top-2" : "animate-out slide-out-to-top-2"
      )}
      data-testid="notification-toast"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <p 
              className="text-sm font-medium text-foreground mb-1"
              data-testid="notification-title"
            >
              {title}
            </p>
          )}
          <p 
            className="text-xs text-muted-foreground"
            data-testid="notification-message"
          >
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="notification-close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar for auto-close */}
      {autoClose && show && (
        <div className="mt-3 w-full bg-muted rounded-full h-1 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all ease-linear",
              type === "success" && "bg-green-600",
              type === "error" && "bg-red-600", 
              type === "warning" && "bg-orange-600",
              type === "info" && "bg-blue-600"
            )}
            style={{
              animation: `shrink ${duration}ms linear`,
              width: "100%"
            }}
            data-testid="notification-progress"
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
