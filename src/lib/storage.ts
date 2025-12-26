// IndexedDB storage for offline persistence
import { P2PMessage, LocalProfile, Peer } from '@/types/p2p';

const DB_NAME = 'lan-chat-db';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Messages store
      if (!database.objectStoreNames.contains('messages')) {
        const messagesStore = database.createObjectStore('messages', { keyPath: 'id' });
        messagesStore.createIndex('conversation', ['senderId', 'receiverId']);
        messagesStore.createIndex('timestamp', 'timestamp');
      }
      
      // Profile store
      if (!database.objectStoreNames.contains('profile')) {
        database.createObjectStore('profile', { keyPath: 'id' });
      }
      
      // Peers store (cached known peers)
      if (!database.objectStoreNames.contains('peers')) {
        database.createObjectStore('peers', { keyPath: 'id' });
      }
    };
  });
}

// Profile operations
export async function saveProfile(profile: LocalProfile): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('profile', 'readwrite');
    tx.objectStore('profile').put(profile);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProfile(): Promise<LocalProfile | null> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('profile', 'readonly');
    const request = tx.objectStore('profile').getAll();
    request.onsuccess = () => {
      const profiles = request.result;
      resolve(profiles.length > 0 ? profiles[0] : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProfile(): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('profile', 'readwrite');
    tx.objectStore('profile').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Message operations
export async function saveMessage(message: P2PMessage): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('messages', 'readwrite');
    tx.objectStore('messages').put({
      ...message,
      timestamp: message.timestamp.toISOString()
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMessages(peerId1: string, peerId2: string): Promise<P2PMessage[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('messages', 'readonly');
    const request = tx.objectStore('messages').getAll();
    
    request.onsuccess = () => {
      const allMessages = request.result as any[];
      const filtered = allMessages
        .filter(m => 
          (m.senderId === peerId1 && m.receiverId === peerId2) ||
          (m.senderId === peerId2 && m.receiverId === peerId1)
        )
        .map(m => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateMessageStatus(messageId: string, status: P2PMessage['status']): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    const request = store.get(messageId);
    
    request.onsuccess = () => {
      const message = request.result;
      if (message) {
        message.status = status;
        store.put(message);
      }
    };
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Peers operations
export async function savePeer(peer: Peer): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('peers', 'readwrite');
    tx.objectStore('peers').put({
      ...peer,
      lastSeen: peer.lastSeen.toISOString()
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPeers(): Promise<Peer[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('peers', 'readonly');
    const request = tx.objectStore('peers').getAll();
    request.onsuccess = () => {
      const peers = request.result.map((p: any) => ({
        ...p,
        lastSeen: new Date(p.lastSeen)
      }));
      resolve(peers);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllData(): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(['messages', 'profile', 'peers'], 'readwrite');
    tx.objectStore('messages').clear();
    tx.objectStore('profile').clear();
    tx.objectStore('peers').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
