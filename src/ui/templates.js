export function badge(side) {
  if (side === 'BUY') return '<span class="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-300">BUY</span>';
  if (side === 'SELL') return '<span class="px-2 py-1 text-xs rounded bg-rose-500/20 text-rose-300">SELL</span>';
  return '<span class="px-2 py-1 text-xs rounded bg-slate-500/20 text-slate-300">NEUTRAL</span>';
}
