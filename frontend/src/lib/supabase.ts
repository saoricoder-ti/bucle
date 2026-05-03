import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dxftyonelivblygauawv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_OetXzBq7YdPb7WN-JfQd3w_-e0d51uE';

export const supabase = createClient(supabaseUrl, supabaseKey);
