
export enum Theme {
  DEEP_PURPLE = 'deep-purple',
  CLASSIC_DARK = 'classic-dark',
  PASTEL_MINT = 'pastel-mint',
  EMERALD_NIGHT = 'emerald-night'
}

export enum Tab {
  DASHBOARD = 'dashboard',
  MISSIONS = 'missions',
  SHOP = 'shop',
  AI_ASSISTANT = 'ai-assistant',
  ADD_CHILD = 'add-child'
}

export interface Dream {
  title: string;
  price: number;
  current: number;
  image: string;
}

export interface Balance {
  confirmed: number;
  pending: number;
}

export interface Mission {
  id: string;
  title: string;
  reward: number;
  status: 'active' | 'completed' | 'pending';
  category: 'chores' | 'education' | 'sports';
  isRecurring: boolean;
}

export interface Prize {
  id: string;
  name: string;
  cost: number;
  image: string;
  isOneTime: boolean;
}

export interface Activity {
  id: string;
  type: 'mission' | 'purchase' | 'adjustment';
  description: string;
  amount: number;
  date: string;
}

export interface Child {
  id: string;
  name: string;
  avatar: string;
  dream: Dream;
  balance: Balance;
  inviteCode: string;
  missions: Mission[];
  activities: Activity[];
  pendingPrizes: Prize[];
}
