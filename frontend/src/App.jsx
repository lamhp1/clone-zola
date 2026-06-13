import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  Divider,
  Dropdown,
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
  none: "Chưa kết bạn",
  sent: "Đã gửi lời mời",
  received: "Đang chờ phản hồi",
  friends: "Bạn bè"
};

const relationColors = {
  none: "default",
  sent: "processing",
  received: "warning",
  friends: "success"
};

const reactionIcons = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}"];
const stickerItems = [
  {
    label: "Cười tươi",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Grinning%20face/3D/grinning_face_3d.png"
  },
  {
    label: "Cười ra nước mắt",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Face%20with%20tears%20of%20joy/3D/face_with_tears_of_joy_3d.png"
  },
  {
    label: "Mặt cười tim",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Smiling%20face%20with%20hearts/3D/smiling_face_with_hearts_3d.png"
  },
  {
    label: "Hôn gió",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Face%20blowing%20a%20kiss/3D/face_blowing_a_kiss_3d.png"
  },
  {
    label: "Ôm nè",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hugging%20face/3D/hugging_face_3d.png"
  },
  {
    label: "Mắt long lanh",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Pleading%20face/3D/pleading_face_3d.png"
  },
  {
    label: "Mắt sao",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Star-struck/3D/star-struck_3d.png"
  },
  {
    label: "Pháo giấy",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Party%20popper/3D/party_popper_3d.png"
  },
  {
    label: "Lửa",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png"
  },
  {
    label: "Lấp lánh",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Sparkles/3D/sparkles_3d.png"
  },
  {
    label: "Trái tim",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20heart/3D/red_heart_3d.png"
  },
  {
    label: "Nơ hồng",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Ribbon/3D/ribbon_3d.png"
  }
];

function avatarUrl(entity, fallback = "U") {
  return entity?.avatar || `https://placehold.co/120x120/1677ff/ffffff?text=${fallback}`;
}

function conversationTitle(conversation, user) {
  if (!conversation) {
    return "Chat";
  }

  if (conversation.type === "group") {
    return conversation.group?.name || "Nhóm chat";
  }

  const nickname = conversation.nicknames?.find(
    (item) =>
      (item.owner?._id || item.owner) === user?._id &&
      (item.target?._id || item.target) === conversation.otherUser?._id
  );

  return nickname?.name || conversation.otherUser?.name || "Chat riêng";
}

function lastMessagePreview(conversation) {
  if (!conversation.lastMessage) {
    return "Chưa có tin nhắn";
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

  useLayoutEffect(() => {
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
      setNotice("Đã gửi lời mời kết bạn.");
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
      setNotice("Đã tạo nhóm.");
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
        setNotice(response?.message || "Không gửi được tin nhắn");
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
        setNotice(response?.message || "Không thả được cảm xúc");
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
      setNotice("Đã cập nhật tên gợi nhớ.");
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
          <Text type="secondary">Đang kiểm tra phiên đăng nhập...</Text>
        </div>
      ) : user ? (
        <section className="chatApp">
          <aside className="leftRail">
            <div className="brandBlock">
              <div className="brandMark">Z</div>
              <div className="brandText">
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
                Đăng xuất
              </Button>
            </Card>


            {notice ? (
              <Alert className="noticeAlert" type="info" showIcon closable message={notice} onClose={() => setNotice("")} />
            ) : null}

            <div className="railSection">
              <Flex justify="space-between" align="center">
                <Text strong>Cuộc trò chuyện</Text>
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
                {!conversations.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có chat" /> : null}
              </div>
            </div>

            <details className="friendsDetails">
              <summary>
                <span>Bạn bè & tạo nhóm</span>
                <Tag>{friends.length}</Tag>
              </summary>
              <div className="friendsDetailsBody">
              <div className="friendScroller">
                {friends.map((friend) => (
                  <button className="friendChip" type="button" key={friend._id} onClick={() => startChat(friend._id)}>
                    <Avatar src={avatarUrl(friend, "U")}>{friend.name?.[0]}</Avatar>
                    <span>{friend.name}</span>
                  </button>
                ))}
                {!friends.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bạn bè" /> : null}
              </div>

              <Divider />
              <form className="groupCreateForm" onSubmit={handleCreateGroup}>
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Tên nhóm"
                />
                <Checkbox.Group
                  className="friendCheckboxes"
                  value={selectedFriendIds}
                  onChange={setSelectedFriendIds}
                  options={friends.map((friend) => ({ label: friend.name, value: friend._id }))}
                />
                <Button type="primary" htmlType="submit" block>
                  Tạo nhóm
                </Button>
              </form>
              </div>
            </details>
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
                        ? `${activeGroup?.members?.length || 0} thành viên`
                        : activeConversation.otherUser?.email}
                    </Text>
                  </div>
                </Flex>
              ) : (
                <div>
                  <Title level={4}>Hãy chọn một cuộc trò chuyện</Title>
                  <Text type="secondary">Tin nhắn, sticker, reaction và đã xem sẽ hiển thị tại đây.</Text>
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
                            <Text className="senderName">{mine ? "Bạn" : item.sender?.name || "Thành viên"}</Text>
                            <div className="reactionBar">
                              {reactionIcons.map((icon) => (
                                <Tooltip title="Thả cảm xúc" key={icon}>
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
                            {seen ? <Text type="secondary">Đã xem</Text> : null}
                          </Flex>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <Empty description="Chưa có tin nhắn. Gửi lời chào đầu tiên đi." />
                )
              ) : (
                <Empty description="Chọn bạn bè, nhóm hoặc cuộc trò chuyện để bắt đầu." />
              )}
            </div>

            {activeConversation ? (
              <footer className="composer">
                <form className="composerForm" onSubmit={sendMessage}>
                  <Dropdown
                    trigger={["click"]}
                    placement="topLeft"
                    dropdownRender={() => (
                      <div className="stickerPicker">
                        {stickerItems.map((sticker) => (
                          <Tooltip title={sticker.label} key={sticker.url}>
                            <button
                              type="button"
                              className="stickerButton"
                              onClick={() => sendPayload(sticker.url, "sticker")}
                            >
                              <img src={sticker.url} alt={sticker.label} />
                            </button>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                  >
                    <Button size="large" type="default" htmlType="button">
                      Sticker
                    </Button>
                  </Dropdown>
                  <Input
                    size="large"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Nhập tin nhắn..."
                  />
                  <Button size="large" type="primary" htmlType="submit">
                    Gửi
                  </Button>
                </form>
              </footer>
            ) : null}
          </section>

          <aside className="rightPanel">
            <Card bordered={false} className="sideCard">
              <Title level={5}>Tìm bạn bè</Title>
              <form className="searchForm" onSubmit={handleSearch}>
                <Input.Search
                  allowClear
                  size="large"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onSearch={() => refreshSearch().catch((error) => setNotice(error.message))}
                  placeholder="Tìm Gmail, userCode hoặc tên gợi nhớ"
                />
              </form>
              <List
                dataSource={results}
                locale={{ emptyText: "Nhập Gmail, userCode hoặc tên gợi nhớ để tìm" }}
                renderItem={(result) => (
                  <List.Item
                    actions={[
                      result.relationshipStatus === "none" ? (
                        <Button size="small" type="primary" onClick={() => handleAddFriend(result.id)}>
                          Kết bạn
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
                          {result.matchedNickname ? (
                            <Text type="secondary">Tên gợi nhớ: {result.matchedNickname}</Text>
                          ) : null}
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
              <Title level={5}>Lời mời kết bạn</Title>
              <List
                dataSource={[...requests.incoming, ...requests.outgoing]}
                locale={{ emptyText: "Không có lời mời đang chờ" }}
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
                            Nhận
                          </Button>
                          <Button size="small" onClick={() => handleRequestAction(declineFriendRequest, request._id)}>
                            Từ chối
                          </Button>
                        </Space>
                      ) : (
                        <Button size="small" onClick={() => handleRequestAction(cancelFriendRequest, request._id)}>
                          Hủy
                        </Button>
                      )}
                    </List.Item>
                  );
                }}
              />
            </Card>

            {activeGroup ? (
              <Card bordered={false} className="sideCard">
                <Title level={5}>Quản lý nhóm</Title>
                {isGroupAdmin ? (
                  <form
                    className="stackForm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateGroup(() => renameGroup(activeGroup._id, renameValue));
                    }}
                  >
                    <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
                    <Button htmlType="submit">Đổi tên nhóm</Button>
                  </form>
                ) : null}

                <List
                  dataSource={activeGroup.members}
                  renderItem={(member) => (
                    <List.Item
                      actions={[
                        isGroupAdmin && member._id !== user._id ? (
                          <Button size="small" danger onClick={() => updateGroup(() => removeGroupMember(activeGroup._id, member._id))}>
                            Xóa
                          </Button>
                        ) : null
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar src={avatarUrl(member, "U")}>{member.name?.[0]}</Avatar>}
                        title={member.name}
                        description={
                          activeGroup.admins.some((admin) => (admin._id || admin) === member._id) ? "Admin" : "Thành viên"
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
                      placeholder="Chọn bạn bè để thêm"
                      options={addableFriends.map((friend) => ({ label: friend.name, value: friend._id }))}
                    />
                    <Button htmlType="submit">Thêm thành viên</Button>
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
                  Rời nhóm
                </Button>
              </Card>
            ) : activeConversation?.otherUser ? (
              <Card bordered={false} className="sideCard">
                <Title level={5}>Tên gợi nhớ</Title>
                <form className="stackForm" onSubmit={saveNickname}>
                  <Input
                    value={nicknameValue}
                    onChange={(event) => setNicknameValue(event.target.value)}
                    placeholder="Nhập tên gợi nhớ"
                  />
                  <Button type="primary" htmlType="submit">
                    Lưu tên
                  </Button>
                </form>
                <Text type="secondary">Tên này chỉ hiển thị với tài khoản của bạn.</Text>
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
              Giao diện mới gọn, hiện đại và sẵn sàng cho chat cá nhân, nhóm, sticker,
              reaction và trạng thái đã xem.
            </Text>
            <Button size="large" type="primary" href={getGoogleLoginUrl()}>
              Đăng nhập bằng Google
            </Button>
          </div>
          <Card className="heroPreview" bordered={false}>
            <div className="previewBubble left">Xin chào, hôm nay triển khai UI mới nhé.</div>
            <div className="previewBubble right">Quá đẹp. Gửi sticker luôn!</div>
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
