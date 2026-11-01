import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Public values: safe to ship in the app. Row level security protects each client's data.
export const SUPABASE_URL = 'https://ejcditarwgsqasecuqmx.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_7-MLNhS_mB4odxRMlNo4CA_99Dn50vk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
