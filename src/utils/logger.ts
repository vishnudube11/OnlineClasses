/**
 * Centralized logging utility for the application
 * Supports different log levels and includes context information
 * Also tracks user visit history
 */

import { auth } from "@/src/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  userId?: string;
  screen?: string;
  action?: string;
  [key: string]: any;
}

interface VisitHistoryEntry {
  timestamp: string;
  screen: string;
  userId?: string;
  action?: string;
  details?: Record<string, any>;
}

const VISIT_HISTORY_KEY = "@visit_history";
const MAX_HISTORY_ENTRIES = 100;

class Logger {
  private isDevelopment = __DEV__;

  private formatTimestamp(): string {
    const now = new Date();
    const date = now.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return `${date} ${time}`;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = this.formatTimestamp();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDevelopment) {
      // In production, you might want to send logs to a service
      // For now, we'll only log in development
      return;
    }

    const formatted = this.formatMessage(level, message, context);

    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "debug":
        console.debug(formatted);
        break;
      case "info":
      default:
        console.log(formatted);
        break;
    }
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error | any, context?: LogContext) {
    const errorContext = {
      ...context,
      errorMessage: error?.message,
      errorStack: error?.stack,
    };
    this.log("error", message, errorContext);
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  // Specialized logging methods for common actions
  auth(action: string, details?: LogContext) {
    this.info(`Auth: ${action}`, { ...details, category: "auth" });
  }

  payment(action: string, details?: LogContext) {
    this.info(`Payment: ${action}`, { ...details, category: "payment" });
  }

  api(action: string, details?: LogContext) {
    this.info(`API: ${action}`, { ...details, category: "api" });
  }

  navigation(from: string, to: string, details?: LogContext) {
    this.info(`Navigation: ${from} -> ${to}`, {
      ...details,
      category: "navigation",
    });
  }

  // User visit history tracking
  async logVisit(
    screen: string,
    userId?: string,
    action?: string,
    details?: Record<string, any>,
  ) {
    const entry: VisitHistoryEntry = {
      timestamp: new Date().toISOString(),
      screen,
      userId,
      action,
      details,
    };

    // Log to local storage
    try {
      const history = await this.getVisitHistory();
      history.push(entry);

      // Keep only last MAX_HISTORY_ENTRIES
      if (history.length > MAX_HISTORY_ENTRIES) {
        history.shift();
      }

      await AsyncStorage.setItem(VISIT_HISTORY_KEY, JSON.stringify(history));
      this.info(`Visit logged locally: ${screen}`, { userId, action });
    } catch (error) {
      this.error("Failed to log visit locally", error, { screen, userId });
    }

    // Also send to server if user is authenticated
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

        if (baseUrl) {
          await axios.post(
            `${baseUrl}/api/visits/log`,
            {
              screen,
              action: action || "view",
              details: details || {},
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
            },
          );
          this.info(`Visit logged to server: ${screen}`, {
            userId: currentUser.email || undefined,
            action,
          });
        }
      }
    } catch (error) {
      this.error("Failed to log visit to server", error, { screen, userId });
      // Don't throw - local logging is sufficient
    }
  }

  async getVisitHistory(): Promise<VisitHistoryEntry[]> {
    try {
      const historyJson = await AsyncStorage.getItem(VISIT_HISTORY_KEY);
      if (!historyJson) return [];
      const history = JSON.parse(historyJson);
      return Array.isArray(history) ? history : [];
    } catch (error) {
      this.error("Failed to get visit history", error);
      return [];
    }
  }

  async clearVisitHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(VISIT_HISTORY_KEY);
      this.info("Visit history cleared");
    } catch (error) {
      this.error("Failed to clear visit history", error);
    }
  }

  async getVisitHistoryByScreen(screen: string): Promise<VisitHistoryEntry[]> {
    try {
      const history = await this.getVisitHistory();
      return history.filter((entry) => entry.screen === screen);
    } catch (error) {
      this.error("Failed to get visit history by screen", error, { screen });
      return [];
    }
  }

  async getVisitHistoryByUser(userId: string): Promise<VisitHistoryEntry[]> {
    try {
      const history = await this.getVisitHistory();
      return history.filter((entry) => entry.userId === userId);
    } catch (error) {
      this.error("Failed to get visit history by user", error, { userId });
      return [];
    }
  }

  // Get visit history from server
  async getServerVisitHistory(screen?: string, limit?: number): Promise<any[]> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        this.warn("Cannot get server history: user not authenticated");
        return [];
      }

      const idToken = await currentUser.getIdToken();
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

      if (!baseUrl) {
        this.error("Missing EXPO_PUBLIC_API_BASE_URL", null, {
          action: "get_server_history",
        });
        return [];
      }

      const params: any = {};
      if (screen) params.screen = screen;
      if (limit) params.limit = limit;

      const res = await axios.get(`${baseUrl}/api/visits/history`, {
        params,
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      this.info("Server visit history retrieved", {
        count: res.data.visits?.length,
      });
      return res.data.visits || [];
    } catch (error) {
      this.error("Failed to get server visit history", error, { screen });
      return [];
    }
  }
}

export const logger = new Logger();
