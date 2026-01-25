
import { Child, Mission, Prize, Activity } from './types';

export const INITIAL_CHILDREN: Child[] = [
  {
    id: '1',
    name: 'Стас',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Stas',
    dream: {
      title: 'PlayStation 5',
      price: 50000,
      current: 0,
      image: 'https://picsum.photos/seed/ps5/400/300'
    },
    balance: { confirmed: 0, pending: 0 },
    inviteCode: '',
    missions: [],
    activities: [],
    pendingPrizes: []
  },
  {
    id: '2',
    name: 'Юра',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yura',
    dream: {
      title: 'Велосипед',
      price: 30000,
      current: 0,
      image: 'https://picsum.photos/seed/bike/400/300'
    },
    balance: { confirmed: 0, pending: 0 },
    inviteCode: '',
    missions: [],
    activities: [],
    pendingPrizes: []
  },
  {
    id: '3',
    name: 'Аксинья',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aksinya',
    dream: {
      title: 'Кукла',
      price: 5000,
      current: 0,
      image: 'https://picsum.photos/seed/doll/400/300'
    },
    balance: { confirmed: 0, pending: 0 },
    inviteCode: '',
    missions: [],
    activities: [],
    pendingPrizes: []
  },
  {
    id: '4',
    name: 'Свят',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Svyat',
    dream: {
      title: 'Лего',
      price: 15000,
      current: 0,
      image: 'https://picsum.photos/seed/lego/400/300'
    },
    balance: { confirmed: 0, pending: 0 },
    inviteCode: '',
    missions: [],
    activities: [],
    pendingPrizes: []
  },
  {
    id: '5',
    name: 'тест',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Test',
    dream: {
      title: 'Игрушка',
      price: 3000,
      current: 0,
      image: 'https://picsum.photos/seed/toy/400/300'
    },
    balance: { confirmed: 0, pending: 0 },
    inviteCode: '',
    missions: [],
    activities: [],
    pendingPrizes: []
  }
];

export const PRIZES: Prize[] = [
  { id: 'p1', name: 'Киновечер', cost: 20, image: 'https://picsum.photos/seed/movie/200/200', isOneTime: true },
  { id: 'p2', name: 'Доп. время (1ч)', cost: 10, image: 'https://picsum.photos/seed/screen/200/200', isOneTime: false },
  { id: 'p3', name: 'Видеоигра', cost: 60, image: 'https://picsum.photos/seed/game/200/200', isOneTime: true }
];
