import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export type Role = 'user' | 'model';

export interface Message {
  id: string;
  role: Role;
  text: string;
  createdAt: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  groundingUrls?: string[];
}

export interface Chat {
  id: string;
  title: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firestoreService = {
  subscribeToChats: (userId: string, callback: (chats: Chat[]) => void) => {
    const chatsRef = collection(db, `users/${userId}/chats`);
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const chats: Chat[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          title: data.title,
          model: data.model,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          updatedAt: data.updatedAt?.toMillis() || Date.now(),
          messages: [], // Messages are loaded separately
        };
      });
      callback(chats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/chats`);
    });
  },

  subscribeToMessages: (userId: string, chatId: string, callback: (messages: Message[]) => void) => {
    const messagesRef = collection(db, `users/${userId}/chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          role: data.role as Role,
          text: data.text,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
          groundingUrls: data.groundingUrls,
        };
      });
      callback(messages);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/chats/${chatId}/messages`);
    });
  },

  createChat: async (userId: string, model: string = 'gemini-3-flash-preview'): Promise<string> => {
    const chatId = uuidv4();
    const chatRef = doc(db, `users/${userId}/chats/${chatId}`);
    try {
      await setDoc(chatRef, {
        id: chatId,
        title: 'New Chat',
        model,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return chatId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, chatRef.path);
      throw error;
    }
  },

  updateChat: async (userId: string, chatId: string, updates: Partial<Chat>) => {
    const chatRef = doc(db, `users/${userId}/chats/${chatId}`);
    try {
      const firestoreUpdates: any = { ...updates, updatedAt: serverTimestamp() };
      delete firestoreUpdates.messages;
      delete firestoreUpdates.id;
      delete firestoreUpdates.createdAt;
      
      if (Object.keys(firestoreUpdates).length > 1) {
        await updateDoc(chatRef, firestoreUpdates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, chatRef.path);
    }
  },

  deleteChat: async (userId: string, chatId: string) => {
    const chatRef = doc(db, `users/${userId}/chats/${chatId}`);
    try {
      await deleteDoc(chatRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, chatRef.path);
    }
  },

  addMessage: async (userId: string, chatId: string, message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> => {
    const messageId = uuidv4();
    const messageRef = doc(db, `users/${userId}/chats/${chatId}/messages/${messageId}`);
    const chatRef = doc(db, `users/${userId}/chats/${chatId}`);
    
    try {
      const messageData: any = {
        id: messageId,
        role: message.role,
        text: message.text,
        createdAt: serverTimestamp(),
      };
      if (message.mediaUrl) messageData.mediaUrl = message.mediaUrl;
      if (message.mediaType) messageData.mediaType = message.mediaType;
      if (message.groundingUrls) messageData.groundingUrls = message.groundingUrls;

      await setDoc(messageRef, messageData);

      // Auto-generate title if it's the first user message
      const chatDoc = await getDoc(chatRef);
      if (chatDoc.exists() && chatDoc.data().title === 'New Chat' && message.role === 'user') {
        const title = message.text.slice(0, 30) + (message.text.length > 30 ? '...' : '');
        await updateDoc(chatRef, { title, updatedAt: serverTimestamp() });
      } else {
        await updateDoc(chatRef, { updatedAt: serverTimestamp() });
      }

      return {
        ...message,
        id: messageId,
        createdAt: Date.now(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, messageRef.path);
      throw error;
    }
  },
  
  updateMessageText: async (userId: string, chatId: string, messageId: string, text: string) => {
    const messageRef = doc(db, `users/${userId}/chats/${chatId}/messages/${messageId}`);
    try {
      await updateDoc(messageRef, { text });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, messageRef.path);
    }
  },

  updateMessageMedia: async (userId: string, chatId: string, messageId: string, mediaUrl: string, mediaType: 'image' | 'video' | 'audio') => {
    const messageRef = doc(db, `users/${userId}/chats/${chatId}/messages/${messageId}`);
    try {
      await updateDoc(messageRef, { mediaUrl, mediaType });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, messageRef.path);
    }
  },

  updateMessageGrounding: async (userId: string, chatId: string, messageId: string, groundingUrls: string[]) => {
    const messageRef = doc(db, `users/${userId}/chats/${chatId}/messages/${messageId}`);
    try {
      await updateDoc(messageRef, { groundingUrls });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, messageRef.path);
    }
  },

  deleteMessage: async (userId: string, chatId: string, messageId: string) => {
    const messageRef = doc(db, `users/${userId}/chats/${chatId}/messages/${messageId}`);
    try {
      await deleteDoc(messageRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, messageRef.path);
    }
  }
};
