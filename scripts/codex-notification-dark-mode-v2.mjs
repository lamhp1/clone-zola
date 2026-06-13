import fs from "node:fs";

const files = {
  app: "frontend/src/App.jsx",
  watcher: "frontend/src/NotificationWatcher.jsx",
  css: "frontend/src/styles.css",
  watcherCss: "frontend/src/notificationWatcher.css"
};

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Missing target: ${label}`);
  }
  return source.replace(search, replacement);
}

let watcher = fs.readFileSync(files.watcher, "utf8");
watcher = replaceOnce(watcher, 'import { useEffect, useMemo, useRef, useState } from "react";', 'import { useEffect, useRef, useState } from "react";', "watcher React import");
watcher = replaceOnce(watcher, 'import { Badge, Button, notification } from "antd";', 'import { Badge, notification, Switch } from "antd";', "watcher Ant import");
watcher = replaceOnce(
  watcher,
  `  const [permission, setPermission] = useState(getNotificationPermission);
  const [unreadCount, setUnreadCount] = useState(0);`,
  `  const [permission, setPermission] = useState(getNotificationPermission);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    typeof window === "undefined" ? true : localStorage.getItem("clone-zola-notifications") !== "off"
  );
  const [unreadCount, setUnreadCount] = useState(0);`,
  "notification state"
);
watcher = watcher.replace(/\n  const canAskPermission = permission !== "granted" && permission !== "unsupported";\n  const buttonLabel = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[permission\]\);\n/, "\n");
watcher = replaceOnce(
  watcher,
  `      notifiedMessagesRef.current.add(messageId);
      const senderName = getSenderName(lastMessage);
      const preview = getContentPreview(lastMessage);
      setUnreadCount((count) => count + 1);`,
  `      if (!notificationsEnabled) {
        return;
      }

      notifiedMessagesRef.current.add(messageId);
      const senderName = getSenderName(lastMessage);
      const preview = getContentPreview(lastMessage);
      setUnreadCount((count) => count + 1);`,
  "notification enabled guard"
);
watcher = replaceOnce(watcher, "  }, [api, user?._id]);", "  }, [api, notificationsEnabled, user?._id]);", "watcher deps");
watcher = replaceOnce(
  watcher,
  `  async function requestPermission() {
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
  }`,
  `  async function toggleNotifications(checked) {
    setNotificationsEnabled(checked);
    localStorage.setItem("clone-zola-notifications", checked ? "on" : "off");

    if (!checked) {
      setUnreadCount(0);
      api.info({ message: "Đã tắt thông báo tin nhắn." });
      return;
    }

    if (getNotificationPermission() === "unsupported") {
      setPermission("unsupported");
      api.info({ message: "Trình duyệt này chưa hỗ trợ thông báo." });
      return;
    }

    if (getNotificationPermission() !== "granted") {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setNotificationsEnabled(false);
        localStorage.setItem("clone-zola-notifications", "off");
        api.info({ message: "Bạn chưa cấp quyền thông báo." });
        return;
      }
    }

    api.info({ message: "Đã bật thông báo tin nhắn." });
  }`,
  "toggle notifications"
);
watcher = replaceOnce(
  watcher,
  `      <Badge count={unreadCount} size="small" offset={[-6, 4]}>
        <Button
          className="notificationWatcherButton"
          disabled={!canAskPermission}
          onClick={requestPermission}
          type={permission === "granted" ? "default" : "primary"}
        >
          {buttonLabel}
        </Button>
      </Badge>`,
  `      <div className="notificationWatcherControl">
        <span>Thông báo</span>
        <Badge count={unreadCount} size="small" offset={[2, -2]}>
          <Switch
            checked={notificationsEnabled && permission !== "unsupported"}
            checkedChildren="Bật"
            unCheckedChildren="Tắt"
            disabled={permission === "unsupported"}
            onChange={toggleNotifications}
          />
        </Badge>
      </div>`,
  "notification switch"
);
fs.writeFileSync(files.watcher, watcher);

let app = fs.readFileSync(files.app, "utf8");
app = replaceOnce(app, "  Space,\n  Spin,", "  Space,\n  Spin,\n  Switch,", "Switch import");
app = replaceOnce(app, "  Tooltip,\n  Typography\n} from \"antd\";", "  Tooltip,\n  Typography,\n  theme\n} from \"antd\";", "theme import");
app = replaceOnce(app, "const { Text, Title } = Typography;", "const { Text, Title } = Typography;\nconst { darkAlgorithm, defaultAlgorithm } = theme;", "theme algorithms");
app = replaceOnce(
  app,
  `  const [nicknameValue, setNicknameValue] = useState("");
  const messagesRef = useRef(null);`,
  `  const [nicknameValue, setNicknameValue] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window === "undefined" ? false : localStorage.getItem("clone-zola-theme") === "dark"
  );
  const messagesRef = useRef(null);`,
  "dark state"
);
app = replaceOnce(
  app,
  `  const selectedConversationTitle =
    activeConversation?.type === "group"
      ? activeGroup?.name || conversationTitle(activeConversation, user)
      : conversationTitle(activeConversation, user);`,
  `  const selectedConversationTitle =
    activeConversation?.type === "group"
      ? activeGroup?.name || conversationTitle(activeConversation, user)
      : conversationTitle(activeConversation, user);

  useEffect(() => {
    localStorage.setItem("clone-zola-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);`,
  "persist theme"
);
app = replaceOnce(app, `<main className="appShell">`, `<main className={["appShell", isDarkMode ? "darkMode" : ""].filter(Boolean).join(" ")}>`, "dark class");
app = replaceOnce(
  app,
  `              <Button block className="ghostButton" onClick={handleLogout}>
                Đăng xuất
              </Button>`,
  `              <div className="themeToggleRow">
                <Text>Chế độ tối</Text>
                <Switch checked={isDarkMode} onChange={setIsDarkMode} checkedChildren="Tối" unCheckedChildren="Sáng" />
              </div>
              <Button block className="ghostButton" onClick={handleLogout}>
                Đăng xuất
              </Button>`,
  "dark switch"
);
app = replaceOnce(
  app,
  `      theme={{
        token: {`,
  `      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
        token: {`,
  "theme algorithm"
);
app = replaceOnce(
  app,
  `          colorPrimary: "#1677ff",`,
  `          colorPrimary: "#1677ff",
          colorBgBase: isDarkMode ? "#0f172a" : "#ffffff",
          colorTextBase: isDarkMode ? "#e5edf8" : "#102033",`,
  "theme tokens"
);
fs.writeFileSync(files.app, app);

let css = fs.readFileSync(files.css, "utf8");
css += `

.themeToggleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #f7fbff;
  border: 1px solid rgba(205, 218, 235, 0.74);
}

.appShell.darkMode {
  color: #e5edf8;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.2), transparent 34rem),
    linear-gradient(135deg, #08111f 0%, #0f172a 52%, #111827 100%);
}

.darkMode .centerStage,
.darkMode .profileCard,
.darkMode .sideCard,
.darkMode .railSection,
.darkMode .friendsDetails,
.darkMode .topBar,
.darkMode .composer {
  border-color: rgba(96, 125, 166, 0.42);
  background: rgba(15, 23, 42, 0.78);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.26);
}

.darkMode .centerStage {
  background:
    linear-gradient(rgba(15, 23, 42, 0.86), rgba(15, 23, 42, 0.9)),
    radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.14), transparent 24rem);
}

.darkMode .bubble {
  color: #e5edf8;
  background: #111827;
  border-color: rgba(96, 125, 166, 0.46);
}

.darkMode .bubble.mine {
  color: #ffffff;
  background: linear-gradient(135deg, #1677ff, #0f5fce);
}

.darkMode .conversationItem,
.darkMode .friendChip,
.darkMode .themeToggleRow,
.darkMode .friendCheckboxes {
  color: #e5edf8;
  background: rgba(15, 23, 42, 0.66);
  border-color: rgba(96, 125, 166, 0.42);
}

.darkMode .conversationItem small,
.darkMode .profileCopy .ant-typography-secondary,
.darkMode .senderName,
.darkMode .friendsDetails summary {
  color: #a8b6cb;
}

.darkMode .conversationItem:hover,
.darkMode .friendChip:hover,
.darkMode .conversationItem.active {
  background: rgba(59, 130, 246, 0.18);
}

.darkMode .ghostButton,
.darkMode .friendsDetails summary::after {
  color: #bfdbfe;
  background: rgba(59, 130, 246, 0.16);
}

.darkMode .stickerPicker,
.darkMode .stickerButton,
.darkMode .reactionButton,
.darkMode .reactionPill {
  background: #111827;
  border-color: rgba(96, 125, 166, 0.46);
}
`;
fs.writeFileSync(files.css, css);

let watcherCss = fs.readFileSync(files.watcherCss, "utf8");
watcherCss = watcherCss.replace(/\.notificationWatcherButton/g, ".notificationWatcherControl");
watcherCss = watcherCss.replace("  border-radius: 999px;", "  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 10px;\n  border: 1px solid rgba(205, 218, 235, 0.74);\n  border-radius: 999px;\n  background: rgba(255, 255, 255, 0.92);");
watcherCss += `

.notificationWatcherControl span {
  color: #0d5fc3;
  font-size: 0.82rem;
  font-weight: 800;
}

body:has(.darkMode) .notificationWatcherControl {
  border-color: rgba(96, 125, 166, 0.42);
  background: rgba(15, 23, 42, 0.86);
}

body:has(.darkMode) .notificationWatcherControl span {
  color: #bfdbfe;
}
`;
fs.writeFileSync(files.watcherCss, watcherCss);
