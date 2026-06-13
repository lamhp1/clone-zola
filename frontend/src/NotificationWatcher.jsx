import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, notification } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const DEFAULT_TITLE = "Clone Zola Chat";

function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function getMessageId(message) {
  return message?.id || message?._id || `${message?.conversation}-${message?.sender?._id || message?.sender}-${message?.createdAt}`;
}

function getSenderId(message) {
  return message?.sender?._id || message?.sender?.id || message?.sender;
}

function getSenderName(message) {
  return message?.sender?.name || "Người dùng";
}

function getContentPreview(message) {
  if (!message) {
    return "Bạn có tin nhắn mới";
  }

  if (message.type === "sticker") {
    return "Đã gửi một sticker";
  }

  return message.content || "Bạn có tin nhắn mới";
}

export function NotificationWatcher() {
  const [api, contextHolder] = notification.useNotification();
  const [user, setUser] = useState(null);
  const [permission, setPermission] = useState(getNotificationPermission);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifiedMessagesRef = useRef(new Set());
  const userRef = useRef(null);

  const canAskPermission = permission !== "granted" && permission !== "unsupported";
  const buttonLabel = useMemo(() => {
    if (permission === "granted") {
      return "Thông báo đã bật";
    }

    if (permission === "denied") {
      return "Thông báo đang bị chặn";
    }

    if (permission === "unsupported") {
      return "Không hỗ trợ thông báo";
    }

    return "Bật thông báo";
  }, [permission]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let ignored = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!ignored) {
          setUser(data.user || null);
        }
      } catch {
        // The watcher is optional; login screen and chat should still work if this request fails.
      }
    }

    loadCurrentUser();

    return () => {
      ignored = true;
    };
  }, []);

  useEffect(() => {
    if (!user?._id) {
      return undefined;
    }

    const socket = io(API_URL, { withCredentials: true });

    socket.on("conversation:updated", ({ lastMessage }) => {
      if (!lastMessage) {
        return;
      }

      const messageId = getMessageId(lastMessage);
      const senderId = getSenderId(lastMessage);

      if (!messageId || !senderId || senderId === userRef.current?._id || notifiedMessagesRef.current.has(messageId)) {
        return;
      }

      notifiedMessagesRef.current.add(messageId);
      const senderName = getSenderName(lastMessage);
      const preview = getContentPreview(lastMessage);
      setUnreadCount((count) => count + 1);

      api.open({
        message: `Tin nhắn mới từ ${senderName}`,
        description: preview,
        placement: "topRight",
        duration: 4
      });

      if (getNotificationPermission() === "granted") {
        const browserNotification = new Notification(`Tin nhắn mới từ ${senderName}`, {
          body: preview,
          icon: userRef.current?.avatar || "/vite.svg",
          tag: messageId
        });

        browserNotification.onclick = () => {
          window.focus();
          setUnreadCount(0);
        };
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [api, user?._id]);

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) ${DEFAULT_TITLE}` : DEFAULT_TITLE;

    const resetUnread = () => setUnreadCount(0);
    window.addEventListener("focus", resetUnread);

    return () => {
      window.removeEventListener("focus", resetUnread);
      document.title = DEFAULT_TITLE;
    };
  }, [unreadCount]);

  async function requestPermission() {
    if (getNotificationPermission() === "unsupported") {
      setPermission("unsupported");
      api.info({ message: "Trình duyệt này chưa hỗ trợ thông báo." });
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);

    api.info({
      message: nextPermission === "granted" ? "Đã bật thông báo tin nhắn." : "Bạn chưa cấp quyền thông báo."
    });
  }

  if (!user) {
    return contextHolder;
  }

  return (
    <>
      {contextHolder}
      <Badge count={unreadCount} size="small" offset={[-6, 4]}>
        <Button
          className="notificationWatcherButton"
          icon={<BellOutlined />}
          disabled={!canAskPermission}
          onClick={requestPermission}
          type={permission === "granted" ? "default" : "primary"}
        >
          {buttonLabel}
        </Button>
      </Badge>
    </>
  );
}
