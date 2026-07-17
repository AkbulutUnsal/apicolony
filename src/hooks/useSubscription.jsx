import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { getSubscriptionState } from '../lib/plans'

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSub = useCallback(async () => {
    if (!user) { setSub(null); setLoading(false); return }
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).single()
    setSub(data || null)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchSub() }, [fetchSub])

  const state = getSubscriptionState(sub)

  return (
    <SubscriptionContext.Provider value={{ sub, loading, refresh: fetchSub, ...state }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
