import type { User, Message, Conversation } from '../types';

// Default admin account
export const adminAccount = {
  email: 'admin@gmail.com',
  password: '123456'
};

export const currentUser: User = {
  id: 'current-user',
  name: 'You',
  email: 'admin@gmail.com',
  avatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
  isOnline: true,
};

export const users: User[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    isOnline: true,
  },
  {
    id: '2',
    name: 'Bob Wilson',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    isOnline: false,
    lastSeen: '2 hours ago',
  },
  {
    id: '3',
    name: 'Carol Davis',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    isOnline: true,
  },
  {
    id: '4',
    name: 'David Chen',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    isOnline: false,
    lastSeen: '1 day ago',
  },
  {
    id: '5',
    name: 'Emma Brown',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    isOnline: true,
  },
];

const generateMessages = (user1: User, user2: User): Message[] => [
  {
    id: '1',
    senderId: user1.id,
    content: 'Hey! How are you doing?',
    timestamp: new Date(Date.now() - 86400000),
    isRead: true,
  },
  {
    id: '2',
    senderId: user2.id,
    content: "I'm doing great, thanks! Just finished a big project at work.",
    timestamp: new Date(Date.now() - 82800000),
    isRead: true,
  },
  {
    id: '3',
    senderId: user1.id,
    content: 'That sounds awesome! What kind of project was it?',
    timestamp: new Date(Date.now() - 79200000),
    isRead: true,
  },
  {
    id: '4',
    senderId: user2.id,
    content: 'It was a web application using React and TypeScript. Really challenging but fun!',
    timestamp: new Date(Date.now() - 75600000),
    isRead: true,
  },
  {
    id: '5',
    senderId: user1.id,
    content: 'Nice! I love working with React too. Maybe we can collaborate on something sometime?',
    timestamp: new Date(Date.now() - 3600000),
    isRead: false,
  },
];

export const conversations: Conversation[] = users.map((user, index) => {
  const messages = generateMessages(currentUser, user);
  return {
    id: `conv-${user.id}`,
    participants: [currentUser, user],
    messages,
    lastMessage: messages[messages.length - 1],
    unreadCount: index === 0 ? 2 : index === 2 ? 1 : 0,
  };
});