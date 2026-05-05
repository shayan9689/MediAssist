import type { ChatPersistence } from '@/features/chat/services/chat-persistence'
import { LocalChatPersistence } from '@/features/chat/services/local-chat-persistence'
import { SupabaseChatPersistence } from '@/features/chat/services/supabase-chat-persistence'
import { enableMockAuth } from '@/shared/config/env'
import { supabase } from '@/shared/lib/supabase/client'

let localSingleton: LocalChatPersistence | null = null

function getLocalPersistence(): LocalChatPersistence {
  if (!localSingleton) {
    localSingleton = new LocalChatPersistence()
  }
  return localSingleton
}

export function createChatPersistence(userId: string | null): ChatPersistence {
  if (!enableMockAuth && supabase && userId) {
    return new SupabaseChatPersistence(supabase, userId)
  }

  return getLocalPersistence()
}
