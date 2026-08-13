import type { Trade } from '@/lib/trade';
import { metricsOf } from '@/lib/trade';

export function exportTradesToCsv(trades: Trade[], capital: number) {
  const headers = [
    'Ticker',
    'Status',
    'Entry Date',
    'Exit Date',
    'Entry Price',
    'Stop Price',
    'Exit Price',
    'Quantity',
    'PnL',
    'R-Multiple',
    'Notes',
  ];

  const rows = trades.map((t) => {
    const { pnl, rMultiple } = metricsOf(t, capital);
    const entryDate = t.entryDate
      ? new Date(t.entryDate).toISOString().split('T')[0]
      : '';
    const exitDate = t.exitDate
      ? new Date(t.exitDate).toISOString().split('T')[0]
      : '';
    const cleanNotes = (t.notes ?? '').replace(/\n/g, ' ').replace(/"/g, '""');

    return [
      t.ticker,
      t.status,
      entryDate,
      exitDate,
      t.entryPrice,
      t.stopPrice,
      t.exitPrice ?? '',
      t.quantity,
      pnl ?? '',
      rMultiple?.toFixed(2) ?? '',
      `"${cleanNotes}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `trades_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
