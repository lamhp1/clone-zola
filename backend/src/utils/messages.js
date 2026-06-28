export function serializeMessage(message) {
  const text = message.text || message.content || "";

  return {
    id: message._id,
    conversationId: message.conversation?._id || message.conversation,
    conversation: message.conversation,
    senderId: message.sender?._id || message.sender,
    sender: message.sender,
    content: message.content || text,
    text,
    type: message.type || "text",
    images: message.images || [],
    reactions: message.reactions || [],
    seenBy: message.seenBy || [],
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  };
}

export function getMessageType(text, images) {
  if (images?.length && text) {
    return "mixed";
  }

  if (images?.length) {
    return "image";
  }

  return "text";
}
