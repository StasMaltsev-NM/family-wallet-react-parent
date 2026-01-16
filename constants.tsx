
import { Child, Mission, Prize, Activity } from './types';

export const INITIAL_CHILDREN: Child[] = [
  {
    id: '1',
    name: 'Миша',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Misha',
    dream: {
      title: 'LEGO Star Wars Сокол Тысячелетия',
      price: 800,
      current: 450,
      image: 'https://picsum.photos/seed/lego/400/300'
    },
    balance: { confirmed: 450, pending: 120 },
    inviteCode: 'MISH-9923-KIDS',
    missions: [
      { id: 'm1', title: 'Убраться в комнате', reward: 5, status: 'active', category: 'chores', isRecurring: true },
      { id: 'm2', title: 'Математика 1ч', reward: 15, status: 'pending', category: 'education', isRecurring: false }
    ],
    activities: [
      { id: 'a1', type: 'mission', description: 'Успехи в математике', amount: 15, date: 'Сегодня, 14:30' }
    ],
    pendingPrizes: [
      { id: 'p1', name: 'Киновечер', cost: 20, image: 'https://picsum.photos/seed/movie/200/200', isOneTime: true }
    ]
  },
  {
    id: '2',
    name: 'Алиса',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alisa',
    dream: {
      title: 'Электрогитара Fender',
      price: 1200,
      current: 300,
      image: 'https://picsum.photos/seed/guitar/400/300'
    },
    balance: { confirmed: 300, pending: 50 },
    inviteCode: 'ALIS-1122-ROCK',
    missions: [
      { id: 'm3', title: 'Выгулять собаку', reward: 10, status: 'active', category: 'chores', isRecurring: true }
    ],
    activities: [],
    pendingPrizes: []
  }
];

export const PRIZES: Prize[] = [
  { id: 'p1', name: 'Киновечер', cost: 20, image: 'https://picsum.photos/seed/movie/200/200', isOneTime: true },
  { id: 'p2', name: 'Доп. время (1ч)', cost: 10, image: 'https://picsum.photos/seed/screen/200/200', isOneTime: false },
  { id: 'p3', name: 'Видеоигра', cost: 60, image: 'https://picsum.photos/seed/game/200/200', isOneTime: true }
];
