const { createClient } = require('@supabase/supabase-js')

// 你的 Supabase URL 和 API 金鑰
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY



const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

module.exports = supabase
