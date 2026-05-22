import { useState, useEffect } from 'react';
import { getMember } from '../lib/memberService';
import type { Member } from '../types';
import { useAuth } from './useAuth';

export function useMember() {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getMember(user.uid)
      .then(setMember)
      .catch(() => setError('Failed to load member data'))
      .finally(() => setLoading(false));
  }, [user]);

  return { member, loading, error };
}
