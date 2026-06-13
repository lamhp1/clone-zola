import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  Divider,
  Empty,
  Flex,
  Input,
  List,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography
} from "antd";
import { io } from "socket.io-client";
import {
  acceptFriendRequest,
  addGroupMember,
  cancelFriendRequest,
  createGroup,
  declineFriendRequest,
  fetchConversations,
  fetchCurrentUser,
  fetchFriends,
  fetchFriendRequests,
  fetchGroup,
  fetchMessages,
  getGoogleLoginUrl,
  leaveGroup,
  logout,
  removeGroupMember,
  renameGroup,
  searchUsers,
  sendFriendRequest,
  startDirectConversation,
  updateConversationNickname
} from "./api.js";

const { Text, Title } = Typography;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const statusLabels = {
  none: "Chua ket ban",
  sent: "Da gui loi moi",
  received: "Dang cho phan hoi",
  friends: "Ban be"
};

const relationColors = {
  none: "default",
  sent: "processing",
  received: "warning",
  friends: "success"
};

const reactionIcons = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}"];
const stickerItems = ["1F600", "1F602", "1F970", "1F389", "1F525", "2728"].map((code) => ({
  code,
  url: `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0.0/color/svg/${code}.svg`
}));

function avatarUrl(entity, fallback = "U") {
  return entity?.avatar || `https://placehold.co/120x120/1677ff/ffffff?text=${fallback}`;
}

function conversationTitle(conversation, user) {
  if (!conversation) {
    return "Chat";
  }

  if (conversation.type === "group") {
    return conversation.group?.name || "Nhom chat";
  }

  const nickname = conversation.nicknames?.find(
    (item) =>
      (item.owner?._id || item.owner) === user?._id &&
      (item.target?._id || item.target) === conversation.otherUser?._id
  );

  return nickname?.name || conversation.otherUser?.name || "Chat rieng";
}

function lastMessagePreview(conversation) {
  if (!conversation.lastMessage) {
    return "Chua co tin nhan";
  }

  return conversation.lastMessage.type === "sticker" ? "Sticker" : conversation.lastMessage.content;
}

export function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [friends, setFriends] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [socket, setSocket] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [memberToAdd, setMemberToAdd] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [nicknameValue, setNicknameValue] = useState("");
  const messagesRef = useRef(null);

  const isGroupAdmin = useMemo(
    () => activeGroup?.admins?.some((admin) => (admin._id || admin) === user?._id),
    [activeGroup, user]
  );

  const addableFriends = friends.filter(
    (friend) => !activeGroup?.members?.some((member) => member._id === friend._id)
  );

  const selectedConversationTitle =
    activeConversation?.type === "group"
      ? activeGroup?.name || conversationTitle(activeConversation, user)
      : conversationTitle(activeConversation, user);

  async function loadRequests() {
    setRequests(await fetchFriendRequests());
  }

  async function loadChatData() {
    const [friendsData, conversationsData] = await Promise.all([fetchFriends(), fetchConversations()]);
    setFriends(friendsData.friends);
    setConversations(conversationsData.conversations);
  }

  async function refreshSearch() {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setResults((await searchUsers(query)).users);
  }

  useEffect(() => {
    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          loadRequests();
          loadChatData();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const nextSocket = io(API_URL, { withCredentials: true });

    nextSocket.on("message:new", (newMessage) => {
      setMessages((items) =>
        items.some((item) => (item.id || item._id) === newMessage.id) ? items : [...items, newMessage]
      );
    });

    nextSocket.on("message:updated", (updatedMessage) => {
      setMessages((items) =>
        items.map((item) => ((item.id || item._id) === updatedMessage.id ? updatedMessage : item))
      );
    });

    nextSocket.on("messages:seen", ({ conversationId, userId }) => {
      setMessages((items) =>
        items.map((item) =>
          item.conversation === conversationId || item.conversation?._id === conversationId
            ? {
                ...item,
                seenBy: item.seenBy?.some((seenUserId) => (seenUserId?._id || seenUserId) === userId)
                  ? item.seenBy
                  : [...(item.seenBy || []), userId]
              }
            : item
        )
      );
    });

    nextSocket.on("conversation:updated", ({ conversationId, lastMessage, updatedAt }) => {
      setConversations((items) => {
        if (!items.some((item) => item.id === conversationId)) {
          loadChatData();
          return items;
        }

        return items
          .map((item) => (item.id === conversationId ? { ...item, lastMessage, updatedAt } : item))
          .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
      });
    });

    setSocket(nextSocket);
    return () => nextSocket.disconnect();
  }, [user]);

  useEffect(() => {
    if (socket && activeConversation) {
      socket.emit("conversation:join", { conversationId: activeConversation.id });
      socket.emit("message:seen", { conversationId: activeConversation.id });
    }
  }, [socket, activeConversation]);

  useEffect(() => {
    const node = messagesRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages.length, activeConversation?.id]);

  async function handleSearch(event) {
    event.preventDefault();

    try {
      await refreshSearch();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function handleAddFriend(resultId) {
    try {
      await sendFriendRequest(resultId);
      setNotice("Da gui loi moi ket ban.");
      await Promise.all([refreshSearch(), loadRequests()]);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function handleRequestAction(action, id) {
    try {
      await action(id);
      await Promise.all([loadRequests(), loadChatData(), refreshSearch()]);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function selectConversation(conversation) {
    try {
      setActiveConversation(conversation);
      setActiveGroup(null);
      setNicknameValue(conversation.otherUser ? conversationTitle(conversation, user) : "");
      setRenameValue(conversation.group?.name || "");
      setMessages((await fetchMessages(conversation.id)).messages);

      if (conversation.type === "group" && conversation.group?._id) {
        const data = await fetchGroup(conversation.group._id);
        setActiveGroup(data.group);
        setRenameValue(data.group.name);
      }
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function startChat(friendId) {
    try {
      const data = await startDirectConversation(friendId);
      setConversations((items) =>
        items.some((item) => item.id === data.conversation.id) ? items : [data.conversation, ...items]
      );
      await selectConversation(data.conversation);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function handleCreateGroup(event) {
    event.preventDefault();

    try {
      const data = await createGroup({ name: groupName, memberIds: selectedFriendIds });
      setGroupName("");
      setSelectedFriendIds([]);
      setNotice("Da tao nhom.");
      await loadChatData();
      await selectConversation({
        id: data.group.conversation._id,
        type: "group",
        group: data.group,
        participants: data.group.members,
        lastMessage: null,
        updatedAt: data.group.updatedAt
      });
    } catch (error) {
      setNotice(error.message);
    }
  }

  function sendPayload(content, type = "text") {
    if (!socket || !activeConversation || !content.trim()) {
      return;
    }

    socket.emit("message:send", { conversationId: activeConversation.id, content, type }, (response) => {
      if (!response?.ok) {
        setNotice(response?.message || "Khong gui duoc tin nhan");
      }
    });
  }

  function sendMessage(event) {
    event.preventDefault();
    sendPayload(draft);
    setDraft("");
  }

  function reactToMessage(messageId, icon) {
    socket?.emit("message:react", { messageId, icon }, (response) => {
      if (!response?.ok) {
        setNotice(response?.message || "Khong tha duoc reaction");
      }
    });
  }

  async function saveNickname(event) {
    event.preventDefault();

    if (!activeConversation?.otherUser) {
      return;
    }

    try {
      const data = await updateConversationNickname(
        activeConversation.id,
        activeConversation.otherUser._id,
        nicknameValue
      );
      setActiveConversation(data.conversation);
      setConversations((items) =>
        items.map((item) => (item.id === data.conversation.id ? data.conversation : item))
      );
      setNotice("Da cap nhat ten goi nho.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function updateGroup(action) {
    try {
      const data = await action();
      if (data?.group) {
        setActiveGroup(data.group);
      }
      await loadChatData();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function handleLogout() {
    await logout();
    socket?.disconnect();
    setUser(null);
    setRequests({ incoming: [], outgoing: [] });
    setResults([]);
    setFriends([]);
    setConversations([]);
    setActiveConversation(null);
    setActiveGroup(null);
    setMessages([]);
  }

  const app = (
    <main className="appShell">
      {isLoading ? (
        <div className="loadingScreen">
          <Spin size="large" />
          <Text type="secondary">Dang kiem tra phien dang nhap...</Text>
        </div>
      ) : user ? (
        <section className="chatApp">
          <aside className="leftRail">
            <div className="brandBlock">
              <div className="brandMark">Z</div>
              <div>
                <Text className="eyebrow">Realtime workspace</Text>
                <Title level={3}>Clone Zola</Title>
              </div>
            </div>

            <Card className="profileCard" bordered={false}>
              <Flex align="center" gap={12}>
                <Badge color="#22c55e" offset={[-4, 42]}>
                  <Avatar size={52} src={avatarUrl(user, "U")}>
                    {user.name?.[0]}
                  </Avatar>
                </Badge>
                <div className="profileCopy">
                  <Text strong>{user.name}</Text>
                  <Text type="secondary">{user.email}</Text>
                  <Tag color="blue">ID {user.userCode}</Tag>
                </div>
              </Flex>
              <Button block className="ghostButton" onClick={handleLogout}>
                Dang xuat
              </Button>
            </Card>

            <form className="searchForm" onSubmit={handleSearch}>
              <Input.Search
                allowClear
                size="large"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onSearch={() => refreshSearch().catch((error) => setNotice(error.message))}
                placeholder="Tim Gmail hoac userCode"
              />
            </form>

            {notice ? (
              <Alert className="noticeAlert" type="info" showIcon closable message={notice} onClose={() => setNotice("")} />
            ) : null}

            <div className="railSection">
              <Flex justify="space-between" align="center">
                <Text strong>Cuoc tro chuyen</Text>
                <Tag>{conversations.length}</Tag>
              </Flex>
              <div className="conversationList">
                {conversations.map((conversation) => (
                  <button
                    className={`conversationItem ${activeConversation?.id === conversation.id ? "active" : ""}`}
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation)}
                  >
                    <Avatar
                      size={42}
                      src={
                        conversation.type === "group"
                          ? avatarUrl(conversation.group, "G")
                          : avatarUrl(conversation.otherUser, "U")
                      }
                    >
                      {conversationTitle(conversation, user)[0]}
                    </Avatar>
                    <span>
                      <strong>{conversationTitle(conversation, user)}</strong>
                      <small>{lastMessagePreview(conversation)}</small>
                    </span>
                  </button>
                ))}
                {!conversations.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chua co chat" /> : null}
              </div>
            </div>
          </aside>

          <section className="centerStage">
            <header className="topBar">
              {activeConversation ? (
                <Flex align="center" gap={12}>
                  <Avatar
                    size={48}
                    src={
                      activeConversation.type === "group"
                        ? avatarUrl(activeGroup || activeConversation.group, "G")
                        : avatarUrl(activeConversation.otherUser, "U")
                    }
                  >
                    {selectedConversationTitle[0]}
                  </Avatar>
                  <div>
                    <Title level={4}>{selectedConversationTitle}</Title>
                    <Text type="secondary">
                      {activeConversation.type === "group"
                        ? `${activeGroup?.members?.length || 0} thanh vien`
                        : activeConversation.otherUser?.email}
                    </Text>
                  </div>
                </Flex>
              ) : (
                <div>
                  <Title level={4}>Hay chon mot cuoc tro chuyen</Title>
                  <Text type="secondary">Tin nhan, sticker, reaction va da xem se hien tai day.</Text>
                </div>
              )}
            </header>

            <div className="messageCanvas" ref={messagesRef}>
              {activeConversation ? (
                messages.length ? (
                  messages.map((item) => {
                    const mine = item.sender?._id === user._id || item.sender === user._id;
                    const messageId = item.id || item._id;
                    const seen = mine && item.seenBy?.some((seenUserId) => (seenUserId?._id || seenUserId) !== user._id);

                    return (
                      <article className={`messageRow ${mine ? "mine" : ""}`} key={messageId}>
                        {!mine ? (
                          <Avatar size={30} src={avatarUrl(item.sender, "U")}>
                            {item.sender?.name?.[0]}
                          </Avatar>
                        ) : null}
                        <div className="messageStack">
                          <div className={`bubble ${mine ? "mine" : ""}`}>
                            {item.type === "sticker" ? (
                              <img className="stickerMessage" src={item.content} alt="Sticker" />
                            ) : (
                              <p>{item.content}</p>
                            )}
                            <Text className="senderName">{mine ? "Ban" : item.sender?.name || "Thanh vien"}</Text>
                            <div className="reactionBar">
                              {reactionIcons.map((icon) => (
                                <Tooltip title="Tha cam xuc" key={icon}>
                                  <button
                                    type="button"
                                    className="reactionButton"
                                    onClick={() => reactToMessage(messageId, icon)}
                                  >
                                    {icon}
                                  </button>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                          <Flex className="messageMeta" gap={6} justify={mine ? "flex-end" : "flex-start"}>
                            {item.reactions?.map((reaction) => (
                              <span className="reactionPill" key={`${reaction.user?._id || reaction.user}-${reaction.icon}`}>
                                {reaction.icon}
                              </span>
                            ))}
                            {seen ? <Text type="secondary">Da xem</Text> : null}
                          </Flex>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <Empty description="Chua co tin nhan. Gui loi chao dau tien di." />
                )
              ) : (
                <Empty description="Chon ban be, nhom hoac cuoc tro chuyen de bat dau." />
              )}
            </div>

            {activeConversation ? (
              <footer className="composer">
                <div className="stickerDock">
                  {stickerItems.map((sticker) => (
                    <Tooltip title="Gui sticker" key={sticker.url}>
                      <button
                        type="button"
                        className="stickerButton"
                        onClick={() => sendPayload(sticker.url, "sticker")}
                      >
                        <img src={sticker.url} alt={`Sticker ${sticker.code}`} />
                      </button>
                    </Tooltip>
                  ))}
                </div>
                <form className="composerForm" onSubmit={sendMessage}>
                  <Input
                    size="large"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Nhap tin nhan..."
                  />
                  <Button size="large" type="primary" htmlType="submit">
                    Gui
                  </Button>
                </form>
              </footer>
            ) : null}
          </section>

          <aside className="rightPanel">
            <Card bordered={false} className="sideCard">
              <Title level={5}>Tim ban be</Title>
              <List
                dataSource={results}
                locale={{ emptyText: "Nhap Gmail hoac userCode de tim" }}
                renderItem={(result) => (
                  <List.Item
                    actions={[
                      result.relationshipStatus === "none" ? (
                        <Button size="small" type="primary" onClick={() => handleAddFriend(result.id)}>
                          Ket ban
                        </Button>
                      ) : null
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar src={avatarUrl(result, "U")}>{result.name?.[0]}</Avatar>}
                      title={result.name}
                      description={
                        <Space direction="vertical" size={2}>
                          <Text type="secondary">{result.email}</Text>
                          <Tag color={relationColors[result.relationshipStatus]}>
                            {statusLabels[result.relationshipStatus]}
                          </Tag>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            <Card bordered={false} className="sideCard">
              <Title level={5}>Loi moi ket ban</Title>
              <List
                dataSource={[...requests.incoming, ...requests.outgoing]}
                locale={{ emptyText: "Khong co loi moi dang cho" }}
                renderItem={(request) => {
                  const incoming = Boolean(request.requester);
                  const person = incoming ? request.requester : request.recipient;

                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar src={avatarUrl(person, "U")}>{person.name?.[0]}</Avatar>}
                        title={person.name}
                        description={person.email}
                      />
                      {incoming ? (
                        <Space>
                          <Button size="small" type="primary" onClick={() => handleRequestAction(acceptFriendRequest, request._id)}>
                            Nhan
                          </Button>
                          <Button size="small" onClick={() => handleRequestAction(declineFriendRequest, request._id)}>
                            Tu choi
                          </Button>
                        </Space>
                      ) : (
                        <Button size="small" onClick={() => handleRequestAction(cancelFriendRequest, request._id)}>
                          Huy
                        </Button>
                      )}
                    </List.Item>
                  );
                }}
              />
            </Card>

            <Card bordered={false} className="sideCard">
              <Title level={5}>Ban be & tao nhom</Title>
              <div className="friendScroller">
                {friends.map((friend) => (
                  <button className="friendChip" type="button" key={friend._id} onClick={() => startChat(friend._id)}>
                    <Avatar src={avatarUrl(friend, "U")}>{friend.name?.[0]}</Avatar>
                    <span>{friend.name}</span>
                  </button>
                ))}
                {!friends.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chua co ban be" /> : null}
              </div>

              <Divider />
              <form className="groupCreateForm" onSubmit={handleCreateGroup}>
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Ten nhom"
                />
                <Checkbox.Group
                  className="friendCheckboxes"
                  value={selectedFriendIds}
                  onChange={setSelectedFriendIds}
                  options={friends.map((friend) => ({ label: friend.name, value: friend._id }))}
                />
                <Button type="primary" htmlType="submit" block>
                  Tao nhom
                </Button>
              </form>
            </Card>

            {activeGroup ? (
              <Card bordered={false} className="sideCard">
                <Title level={5}>Quan ly nhom</Title>
                {isGroupAdmin ? (
                  <form
                    className="stackForm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateGroup(() => renameGroup(activeGroup._id, renameValue));
                    }}
                  >
                    <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
                    <Button htmlType="submit">Doi ten nhom</Button>
                  </form>
                ) : null}

                <List
                  dataSource={activeGroup.members}
                  renderItem={(member) => (
                    <List.Item
                      actions={[
                        isGroupAdmin && member._id !== user._id ? (
                          <Button size="small" danger onClick={() => updateGroup(() => removeGroupMember(activeGroup._id, member._id))}>
                            Xoa
                          </Button>
                        ) : null
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar src={avatarUrl(member, "U")}>{member.name?.[0]}</Avatar>}
                        title={member.name}
                        description={
                          activeGroup.admins.some((admin) => (admin._id || admin) === member._id) ? "Admin" : "Thanh vien"
                        }
                      />
                    </List.Item>
                  )}
                />

                {isGroupAdmin ? (
                  <form
                    className="stackForm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateGroup(() => addGroupMember(activeGroup._id, memberToAdd));
                      setMemberToAdd("");
                    }}
                  >
                    <Select
                      value={memberToAdd || undefined}
                      onChange={setMemberToAdd}
                      placeholder="Chon ban be de them"
                      options={addableFriends.map((friend) => ({ label: friend.name, value: friend._id }))}
                    />
                    <Button htmlType="submit">Them thanh vien</Button>
                  </form>
                ) : null}

                <Button
                  danger
                  block
                  onClick={() =>
                    updateGroup(async () => {
                      await leaveGroup(activeGroup._id);
                      setActiveGroup(null);
                      setActiveConversation(null);
                      setMessages([]);
                      return null;
                    })
                  }
                >
                  Roi nhom
                </Button>
              </Card>
            ) : activeConversation?.otherUser ? (
              <Card bordered={false} className="sideCard">
                <Title level={5}>Ten goi nho</Title>
                <form className="stackForm" onSubmit={saveNickname}>
                  <Input
                    value={nicknameValue}
                    onChange={(event) => setNicknameValue(event.target.value)}
                    placeholder="Nhap ten goi nho"
                  />
                  <Button type="primary" htmlType="submit">
                    Luu ten
                  </Button>
                </form>
                <Text type="secondary">Ten nay chi hien thi voi tai khoan cua ban.</Text>
              </Card>
            ) : null}
          </aside>
        </section>
      ) : (
        <section className="loginHero">
          <div className="heroCopy">
            <Text className="eyebrow">Realtime social chat</Text>
            <Title>Clone Zola Chat</Title>
            <Text>
              Giao dien moi gon, hien dai va san sang cho chat ca nhan, nhom, sticker,
              reaction va trang thai da xem.
            </Text>
            <Button size="large" type="primary" href={getGoogleLoginUrl()}>
              Dang nhap bang Google
            </Button>
          </div>
          <Card className="heroPreview" bordered={false}>
            <div className="previewBubble left">Xin chao, hom nay trien khai UI moi nhe.</div>
            <div className="previewBubble right">Qua dep. Gui sticker luon!</div>
            <img src={stickerItems[2].url} alt="Preview sticker" />
          </Card>
        </section>
      )}
    </main>
  );

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 14,
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        },
        components: {
          Card: { borderRadiusLG: 22 },
          Button: { borderRadius: 12 },
          Input: { borderRadius: 12 }
        }
      }}
    >
      {app}
    </ConfigProvider>
  );
}
