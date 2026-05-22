export interface Member {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  dob: Date;
  gender: string;
  address: string;
  emergencyContact: { name: string; phone: string };
  height: number;
  weight: number;
  bmi: number;
  medicalConditions: string;
  medications: string;
  injuries: string;
  photoUrl: string;
  lockerNumber: string;
  membershipTier: string;
  membershipStatus: 'active' | 'expired' | 'pending_verification' | 'pending_cash';
  membershipExpiry: Date;
  createdAt: Date;
}

export interface Payment {
  id: string;
  amount: number;
  plan: string;
  method: 'card' | 'bank_transfer' | 'cash';
  status: 'confirmed' | 'pending_verification' | 'pending_cash' | 'rejected';
  receiptUrl?: string;
  createdAt: Date;
}

export interface MembershipPlan {
  id: string;
  name: string;
  duration: string;
  price: number;
  features: string[];
  isActive: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

export interface ContactEnquiry {
  name: string;
  email: string;
  message: string;
  createdAt: Date;
}
