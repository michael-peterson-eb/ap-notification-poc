import { UserCheck, User, UserX, UserMinus, UserCircle } from 'lucide-react';

export const COMM_STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Confirmed: {
    label: 'Confirmed',
    color: '#16a34a', // green
    icon: UserCheck,
  },
  ConfirmedLate: {
    label: 'Confirmed Late',
    color: '#3b82f6', // blue
    icon: User,
  },
  Attempted: {
    label: 'Not Confirmed',
    color: '#f59e0b', // amber
    icon: UserCircle,
  },
  Duplicate: {
    label: 'Duplicate',
    color: '#6b7280', // gray
    icon: UserMinus,
  },
  Unreachable: {
    label: 'Unreachable',
    color: '#ef4444', // red
    icon: UserX,
  },
};
