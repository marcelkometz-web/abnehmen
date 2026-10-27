export function selectDailyRecipes(recipes, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date + 'T12:00:00Z').toISOString().slice(0,10)!==date) throw new Error('Ungültiges Datum.');
  const list = recipes.filter(row => row?.id != null && typeof row.title === 'string' && row.title.trim()).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id),'en',{numeric:true}));
  if (list.length < 2) return list;
  const start = ((Math.floor(Date.parse(date) / 86400000) % list.length) + list.length) % list.length;
  return [list[start],list[(start + Math.max(1,Math.floor(list.length / 2))) % list.length]];
}
