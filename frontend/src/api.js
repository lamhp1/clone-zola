const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function getGoogleLoginUrl() {
  return `${API_URL}/api/auth/google`;
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include"
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user;
}

export async function logout() {
  await request("/api/auth/logout", {
    method: "POST"
  });
}

export async function searchUsers(query) {
  const params = new URLSearchParams({ q: query });
  return request(`/api/users/search?${params.toString()}`);
}

export async function fetchFriendRequests() {
  return request("/api/friend-requests");
}

export async function sendFriendRequest(recipientId) {
  return request("/api/friend-requests", {
    method: "POST",
    body: JSON.stringify({ recipientId })
  });
}

export async function acceptFriendRequest(requestId) {
  return request(`/api/friend-requests/${requestId}/accept`, {
    method: "PATCH"
  });
}

export async function declineFriendRequest(requestId) {
  return request(`/api/friend-requests/${requestId}/decline`, {
    method: "PATCH"
  });
}

export async function cancelFriendRequest(requestId) {
  return request(`/api/friend-requests/${requestId}/cancel`, {
    method: "PATCH"
  });
}

export async function fetchFriends() {
  return request("/api/conversations/friends");
}

export async function fetchConversations() {
  return request("/api/conversations");
}

export async function startDirectConversation(friendId) {
  return request("/api/conversations/direct", {
    method: "POST",
    body: JSON.stringify({ friendId })
  });
}

export async function fetchMessages(conversationId) {
  return request(`/api/conversations/${conversationId}/messages`);
}

export async function updateConversationNickname(conversationId, targetUserId, name) {
  return request(`/api/conversations/${conversationId}/nickname`, {
    method: "PATCH",
    body: JSON.stringify({ targetUserId, name })
  });
}

export async function createGroup(payload) {
  return request("/api/groups", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchGroup(groupId) {
  return request(`/api/groups/${groupId}`);
}

export async function renameGroup(groupId, name) {
  return request(`/api/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify({ name })
  });
}

export async function addGroupMember(groupId, memberId) {
  return request(`/api/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({ memberId })
  });
}

export async function removeGroupMember(groupId, memberId) {
  return request(`/api/groups/${groupId}/members/${memberId}`, {
    method: "DELETE"
  });
}

export async function leaveGroup(groupId) {
  return request(`/api/groups/${groupId}/leave`, {
    method: "POST"
  });
}
