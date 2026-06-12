import { useEffect, useMemo, useState } from "react";
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
  startDirectConversation
} from "./api.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const statusLabels = { none: "Not friends", sent: "Request sent", received: "Request received", friends: "Friends" };
const titleOf = (conversation) => conversation?.type === "group" ? conversation.group?.name || "Group chat" : conversation?.otherUser?.name || "Direct chat";

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

  const isGroupAdmin = useMemo(() => {
    if (!activeGroup || !user) return false;
    return activeGroup.admins?.some((admin) => admin._id === user._id || admin === user._id);
  }, [activeGroup, user]);

  async function loadRequests() {
    setRequests(await fetchFriendRequests());
  }

  async function loadChatData() {
    const [friendsData, conversationsData] = await Promise.all([fetchFriends(), fetchConversations()]);
    setFriends(friendsData.friends);
    setConversations(conversationsData.conversations);
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
    if (!user) return undefined;
    const nextSocket = io(API_URL, { withCredentials: true });
    nextSocket.on("message:new", (newMessage) => {
      setMessages((items) => items.some((item) => item.id === newMessage.id) ? items : [...items, newMessage]);
    });
    nextSocket.on("conversation:updated", ({ conversationId, lastMessage, updatedAt }) => {
      setConversations((items) => {
        if (!items.some((item) => item.id === conversationId)) {
          loadChatData();
          return items;
        }
        return items.map((item) => item.id === conversationId ? { ...item, lastMessage, updatedAt } : item)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    });
    setSocket(nextSocket);
    return () => nextSocket.disconnect();
  }, [user]);

  useEffect(() => {
    if (socket && activeConversation) socket.emit("conversation:join", { conversationId: activeConversation.id });
  }, [socket, activeConversation]);

  async function refreshSearch() {
    if (query.trim().length < 2) return;
    setResults((await searchUsers(query)).users);
  }

  async function handleSearch(event) {
    event.preventDefault();
    try { await refreshSearch(); } catch (error) { setNotice(error.message); }
  }

  async function handleRequestAction(action, id) {
    try {
      await action(id);
      setNotice("Friend request updated.");
      await Promise.all([loadRequests(), loadChatData(), refreshSearch()]);
    } catch (error) { setNotice(error.message); }
  }

  async function selectConversation(conversation) {
    try {
      setActiveConversation(conversation);
      setActiveGroup(null);
      setRenameValue(conversation.group?.name || "");
      setMessages((await fetchMessages(conversation.id)).messages);
      if (conversation.type === "group" && conversation.group?._id) {
        const data = await fetchGroup(conversation.group._id);
        setActiveGroup(data.group);
        setRenameValue(data.group.name);
      }
    } catch (error) { setNotice(error.message); }
  }

  async function startChat(friendId) {
    try {
      const data = await startDirectConversation(friendId);
      setConversations((items) => items.some((item) => item.id === data.conversation.id) ? items : [data.conversation, ...items]);
      await selectConversation(data.conversation);
    } catch (error) { setNotice(error.message); }
  }

  async function handleCreateGroup(event) {
    event.preventDefault();
    try {
      const data = await createGroup({ name: groupName, memberIds: selectedFriendIds });
      setGroupName("");
      setSelectedFriendIds([]);
      setNotice("Group created.");
      await loadChatData();
      await selectConversation({ id: data.group.conversation._id, type: "group", group: data.group, participants: data.group.members, lastMessage: null, updatedAt: data.group.updatedAt });
    } catch (error) { setNotice(error.message); }
  }

  function toggleFriend(friendId) {
    setSelectedFriendIds((ids) => ids.includes(friendId) ? ids.filter((id) => id !== friendId) : [...ids, friendId]);
  }

  function sendMessage(event) {
    event.preventDefault();
    if (!socket || !activeConversation || !draft.trim()) return;
    socket.emit("message:send", { conversationId: activeConversation.id, content: draft }, (response) => {
      if (!response?.ok) return setNotice(response?.message || "Could not send message");
      setMessages((items) => items.some((item) => item.id === response.message.id) ? items : [...items, response.message]);
    });
    setDraft("");
  }

  async function updateGroup(action) {
    try {
      const data = await action();
      if (data?.group) setActiveGroup(data.group);
      await loadChatData();
    } catch (error) { setNotice(error.message); }
  }

  async function handleLogout() {
    await logout();
    socket?.disconnect();
    setUser(null);
    setResults([]);
    setRequests({ incoming: [], outgoing: [] });
    setFriends([]);
    setConversations([]);
    setActiveConversation(null);
    setActiveGroup(null);
    setMessages([]);
  }

  const addableFriends = friends.filter((friend) => !activeGroup?.members?.some((member) => member._id === friend._id));

  if (isLoading) return <main className="shell">Checking session...</main>;

  return <main className="shell"><section className="panel"><p className="eyebrow">Realtime Chat MVP</p><h1>Clone Zola Chat</h1><p>Google auth, friends, direct chat and group chat MVP.</p>{user ? <>
    <div className="profile"><img src={user.avatar || "https://placehold.co/96x96?text=U"} alt={user.name} /><div><h2>{user.name}</h2><p>{user.email}</p><strong>User code: {user.userCode}</strong></div><button onClick={handleLogout}>Logout</button></div>
    <form className="search" onSubmit={handleSearch}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by Gmail or userCode" /><button>Search</button></form>{notice ? <p className="notice">{notice}</p> : null}
    <section className="grid"><div><h2>Search results</h2><div className="list">{results.map((result) => <article className="userRow" key={result.id}><img src={result.avatar || "https://placehold.co/96x96?text=U"} alt={result.name} /><div><strong>{result.name}</strong><p>{result.email}</p><small>{result.userCode}</small></div><span className="badge">{statusLabels[result.relationshipStatus]}</span>{result.relationshipStatus === "none" ? <button onClick={async () => { await sendFriendRequest(result.id); await refreshSearch(); setNotice("Friend request sent."); }}>Add</button> : null}</article>)}{!results.length ? <p className="empty">No users found yet.</p> : null}</div></div>
    <div><h2>Friend requests</h2><div className="list">{requests.incoming.map((request) => <article className="requestRow" key={request._id}><div><strong>{request.requester.name}</strong><p>{request.requester.email}</p></div><button onClick={() => handleRequestAction(acceptFriendRequest, request._id)}>Accept</button><button className="secondary" onClick={() => handleRequestAction(declineFriendRequest, request._id)}>Decline</button></article>)}{requests.outgoing.map((request) => <article className="requestRow" key={request._id}><div><strong>{request.recipient.name}</strong><p>{request.recipient.email}</p></div><button className="secondary" onClick={() => handleRequestAction(cancelFriendRequest, request._id)}>Cancel</button></article>)}{!requests.incoming.length && !requests.outgoing.length ? <p className="empty">No pending requests.</p> : null}</div></div></section>
    <section className="chatLayout"><aside className="chatSidebar"><h2>Friends</h2><div className="list">{friends.map((friend) => <button className="friendButton" key={friend._id} onClick={() => startChat(friend._id)}><img src={friend.avatar || "https://placehold.co/96x96?text=U"} alt="" /><span>{friend.name}</span></button>)}{!friends.length ? <p className="empty">Accept a request to start chatting.</p> : null}</div><form className="groupForm" onSubmit={handleCreateGroup}><h2>Create group</h2><input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" /><div className="checkList">{friends.map((friend) => <label key={friend._id}><input type="checkbox" checked={selectedFriendIds.includes(friend._id)} onChange={() => toggleFriend(friend._id)} />{friend.name}</label>)}</div><button>Create group</button></form><h2>Conversations</h2><div className="list">{conversations.map((conversation) => <button className={`conversationButton ${activeConversation?.id === conversation.id ? "active" : ""}`} key={conversation.id} onClick={() => selectConversation(conversation)}><strong>{titleOf(conversation)}</strong><span>{conversation.lastMessage?.content || "No messages yet"}</span></button>)}</div></aside>
    <section className="chatWindow">{activeConversation ? <><header className="chatHeader"><strong>{activeConversation.type === "group" ? activeGroup?.name || titleOf(activeConversation) : titleOf(activeConversation)}</strong><span>{activeConversation.type === "group" ? `${activeGroup?.members?.length || 0} members` : activeConversation.otherUser?.email}</span></header><div className="messages">{messages.map((item) => { const mine = item.sender?._id === user._id || item.sender === user._id; return <article className={`messageBubble ${mine ? "mine" : ""}`} key={item.id || item._id}><p>{item.content}</p><small>{item.sender?.name || "You"}</small></article>; })}{!messages.length ? <p className="empty">No messages yet.</p> : null}</div><form className="messageForm" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message" /><button>Send</button></form></> : <div className="emptyChat">Choose a friend, group or conversation.</div>}</section>
    {activeGroup ? <aside className="groupPanel"><h2>Group members</h2>{isGroupAdmin ? <form className="compactForm" onSubmit={(event) => { event.preventDefault(); updateGroup(() => renameGroup(activeGroup._id, renameValue)); }}><input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder="Rename group" /><button>Rename</button></form> : null}<div className="list">{activeGroup.members.map((member) => <article className="memberRow" key={member._id}><span>{member.name}</span>{activeGroup.admins.some((admin) => admin._id === member._id) ? <small>admin</small> : null}{isGroupAdmin && member._id !== user._id ? <button className="secondary" onClick={() => updateGroup(() => removeGroupMember(activeGroup._id, member._id))}>Remove</button> : null}</article>)}</div>{isGroupAdmin ? <form className="compactForm" onSubmit={(event) => { event.preventDefault(); updateGroup(() => addGroupMember(activeGroup._id, memberToAdd)); setMemberToAdd(""); }}><select value={memberToAdd} onChange={(event) => setMemberToAdd(event.target.value)}><option value="">Choose friend</option>{addableFriends.map((friend) => <option value={friend._id} key={friend._id}>{friend.name}</option>)}</select><button>Add</button></form> : null}<button className="secondary" onClick={() => updateGroup(async () => { await leaveGroup(activeGroup._id); setActiveGroup(null); setActiveConversation(null); setMessages([]); return null; })}>Leave group</button></aside> : null}</section>
  </> : <a className="loginButton" href={getGoogleLoginUrl()}>Login with Google</a>}</section></main>;
}
