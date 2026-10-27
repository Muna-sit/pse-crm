import { createClient } from "@supabase/supabase-js";

// connection to our supabase database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default supabase;


// simple cache
// keeps data in memory for some seconds so we don't load it again and again
// (cleared when the page is refreshed)
const store = {};

export async function cached(key, seconds, loadData) {
  const item = store[key];

  if (item && Date.now() - item.time < seconds * 1000) {
    return item.data;
  }

  const data = await loadData();
  store[key] = { data: data, time: Date.now() };
  return data;
}

export function clearCache(key) {
  delete store[key];
}

// stages list - kept for 5 minutes
export function getStages() {
  return cached("stages", 300, async () => {
    const { data } = await supabase.from("stages").select("*").order("position");
    return data || [];
  });
}

// team list - kept for 5 minutes
export function getPeople() {
  return cached("people", 300, async () => {
    const { data } = await supabase.from("profiles").select("id, name").order("name");
    return data || [];
  });
}
