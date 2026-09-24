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
  membershipStatus: 'active' | 'expired' | 'pending_verification' | 'pending_cash' | 'rejected';
  membershipStatusSource?: 'admin' | 'payment';
  membershipExpiry: Date;
  role: 'customer' | 'admin';
  createdAt: Date;
  // Couple plan fields
  secondaryMemberEmail?: string;    // stored on primary member doc
  linkedPrimaryUid?: string;        // stored on secondary member doc
  isSecondaryMember?: boolean;      // true for secondary couple-plan members
}


export interface Partner {
  id: string;
  fullName: string;
  dob: Date;
  gender: string;
  phone: string;
  address: string;
  emergencyContact: { name: string; phone: string };
  height: number | null;
  weight: number | null;
  bmi: number | null;
  medicalConditions: string;
  medications: string;
  injuries: string;
  photoUrl: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  amount: number;
  plan: string;
  method: 'card' | 'hnb_ipg' | 'bank_transfer' | 'cash';
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

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'off';
  note: string;
  updatedAt: Date;
}
