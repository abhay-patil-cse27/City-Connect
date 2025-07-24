import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useEffect } from 'react';

// Chat management functions
export const createChat = async (chatData) => {
  const { participants, projectId, type, name, description } = chatData;
  
  // Create chat document with only defined fields
  const chatDoc = {
    participants,
    type,
    name,
    description,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
    lastMessageTime: null,
    typingUsers: {}
  };

  // Only add projectId if it exists
  if (projectId) {
    chatDoc.projectId = projectId;
  }

  const chatRef = await addDoc(collection(db, 'chats'), chatDoc);
  
  return { id: chatRef.id, ...chatData };
};

export const sendMessage = async (chatId, messageData) => {
  const { senderId, content, type = 'text', file } = messageData;
  
  let messageContent = content;
  let fileUrl = null;
  
  if (type === 'file' && file) {
    // Upload file to Firebase Storage
    const storageRef = ref(storage, `chat-files/${chatId}/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
    messageContent = file.name;
  }

  const messageRef = await addDoc(collection(db, `chats/${chatId}/messages`), {
    senderId,
    content: messageContent,
    type,
    fileUrl,
    createdAt: serverTimestamp(),
    reactions: {}
  });

  // Update chat's last message
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    lastMessage: messageContent,
    lastMessageTime: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return { id: messageRef.id, ...messageData, fileUrl };
};

export const markChatAsRead = async (chatId, userId) => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    [`readBy.${userId}`]: serverTimestamp()
  });
};

export const updateTypingStatus = async (chatId, userId, isTyping) => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    [`typingUsers.${userId}`]: isTyping ? serverTimestamp() : null
  });
};

export const addMessageReaction = async (chatId, messageId, userId, reaction) => {
  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
  await updateDoc(messageRef, {
    [`reactions.${userId}`]: reaction
  });
};

export const removeMessageReaction = async (chatId, messageId, userId) => {
  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
  await updateDoc(messageRef, {
    [`reactions.${userId}`]: null
  });
};

// React Query hooks
export const useChats = (userId) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId)
      ),
      (snapshot) => {
        const chats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        queryClient.setQueryData(['chats', userId], chats);
      }
    );

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ['chats', userId],
    queryFn: async () => {
      const chatsSnapshot = await getDocs(
        query(
          collection(db, 'chats'),
          where('participants', 'array-contains', userId)
        )
      );
      return chatsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });
};

export const useChatMessages = (chatId) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, `chats/${chatId}/messages`),
        orderBy('createdAt', 'asc')
      ),
      (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        queryClient.setQueryData(['chat-messages', chatId], messages);
      }
    );

    return () => unsubscribe();
  }, [chatId, queryClient]);

  return useQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: async () => {
      const messagesSnapshot = await getDocs(
        query(
          collection(db, `chats/${chatId}/messages`),
          orderBy('createdAt', 'asc')
        )
      );
      return messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });
};

export const useCreateChat = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createChat,
    onSuccess: (data, variables) => {
      variables.participants.forEach(participantId => {
        queryClient.invalidateQueries(['chats', participantId]);
      });
    }
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ chatId, messageData }) => sendMessage(chatId, messageData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['chat-messages', variables.chatId]);
      queryClient.invalidateQueries(['chats']);
    }
  });
};

export const useMarkChatAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ chatId, userId }) => markChatAsRead(chatId, userId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['chats', variables.userId]);
    }
  });
};

export const useUpdateTypingStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ chatId, userId, isTyping }) => updateTypingStatus(chatId, userId, isTyping),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['chats', variables.userId]);
    }
  });
};

export const useAddMessageReaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ chatId, messageId, userId, reaction }) => 
      addMessageReaction(chatId, messageId, userId, reaction),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['chat-messages', variables.chatId]);
    }
  });
};

export const useRemoveMessageReaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ chatId, messageId, userId }) => 
      removeMessageReaction(chatId, messageId, userId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['chat-messages', variables.chatId]);
    }
  });
};

// Real-time chat subscription
export const subscribeToChatMessages = (chatId, callback) => {
  return onSnapshot(
    query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    ),
    (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(messages);
    }
  );
};

export const subscribeToChats = (userId, callback) => {
  return onSnapshot(
    query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    ),
    (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(chats);
    }
  );
}; 