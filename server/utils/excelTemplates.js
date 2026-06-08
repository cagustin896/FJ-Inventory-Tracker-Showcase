const ExcelJS = require('exceljs');

const UNIT_TYPES = ['Brand New (iPhone)', 'Secondhand (iPhone)', 'Android', 'iPad & MacBook'];

const TYPE_CONFIG = {
  'Brand New (iPhone)':  { header: 'FF1D6FA4', bg: 'FFD6E4F7', accent: 'FFB3D1EE' },
  'Secondhand (iPhone)': { header: 'FFB45309', bg: 'FFFEF3C7', accent: 'FFFDE68A' },
  'Android':             { header: 'FF166534', bg: 'FFD1FAE5', accent: 'FFA7F3D0' },
  'iPad & MacBook':      { header: 'FF6B21A8', bg: 'FFF3E8FF', accent: 'FFE9D5FF' },
};

const DARK_HEADER  = 'FF1E293B';
const LIGHT_GRAY   = 'FFF1F5F9';
const MID_GRAY     = 'FFE2E8F0';
const TOTAL_ROW_BG = 'FFCBD5E1';
const WHITE        = 'FFFFFFFF';

function border(style = 'thin') {
  return { top: { style }, left: { style }, bottom: { style }, right: { style } };
}

function applyCell(cell, { value, bold, size, color, fill, align, border: b, italic, wrap } = {}) {
  if (value !== undefined) cell.value = value;
  cell.font = { bold: !!bold, size: size || 10, color: { argb: color || 'FF000000' }, italic: !!italic };
  if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  if (align) cell.alignment = { horizontal: align, vertical: 'middle', wrapText: !!wrap };
  if (b) cell.border = b;
}

// ─── Daily Inventory Report ───────────────────────────────────────────────────

async function buildDailyInventoryReport(branchName, date, morningEntries, eveningEntries, soldEntries, transfers) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'F&J Gadgets Inventory';
  const ws = wb.addWorksheet('Daily Inventory', { views: [{ showGridLines: false }] });

  // Column widths
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 13;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 8;
  ws.getColumn(5).width = 3;   // spacer
  ws.getColumn(6).width = 30;
  ws.getColumn(7).width = 13;
  ws.getColumn(8).width = 14;
  ws.getColumn(9).width = 8;

  let r = 1;

  // ── Banner title row ──
  ws.getRow(r).height = 28;
  const titleCell = ws.getCell(r, 1);
  applyCell(titleCell, {
    value: `${branchName} — Daily Inventory Report`,
    bold: true, size: 14, color: WHITE, fill: DARK_HEADER, align: 'left',
    border: border(),
  });
  ws.mergeCells(r, 1, r, 9);
  r++;

  ws.getRow(r).height = 18;
  const dateCell = ws.getCell(r, 1);
  applyCell(dateCell, {
    value: `Date: ${date}`,
    bold: true, size: 11, color: 'FF475569', fill: LIGHT_GRAY, align: 'left',
    border: border('hair'),
  });
  ws.mergeCells(r, 1, r, 9);
  r++;
  r++; // blank

  // ── Session header row ──
  ws.getRow(r).height = 22;
  const morningLabel = ws.getCell(r, 1);
  applyCell(morningLabel, {
    value: '☀ Morning  (Opening Stock)',
    bold: true, size: 11, color: WHITE, fill: 'FFCA8A04', align: 'center', border: border(),
  });
  ws.mergeCells(r, 1, r, 4);

  const eveningLabel = ws.getCell(r, 6);
  applyCell(eveningLabel, {
    value: '🌙 Evening  (Closing Stock)',
    bold: true, size: 11, color: WHITE, fill: 'FF3730A3', align: 'center', border: border(),
  });
  ws.mergeCells(r, 6, r, 9);
  r++;

  // ── Column headers ──
  ws.getRow(r).height = 18;
  const colHeaders = ['Model', 'Storage', 'Color', 'Qty'];
  colHeaders.forEach((h, i) => {
    [1, 6].forEach(start => {
      const cell = ws.getCell(r, start + i);
      applyCell(cell, { value: h, bold: true, color: 'FF1E293B', fill: MID_GRAY, align: 'center', border: border() });
    });
  });
  r++;

  // ── Group by type ──
  const amByType = {};
  const pmByType = {};
  UNIT_TYPES.forEach(t => {
    amByType[t] = morningEntries.filter(e => e.unit_type === t);
    pmByType[t] = eveningEntries.filter(e => e.unit_type === t);
  });

  const totals = { am: {}, pm: {} };

  for (const type of UNIT_TYPES) {
    const cfg = TYPE_CONFIG[type];

    // Section header
    ws.getRow(r).height = 18;
    [ws.getCell(r, 1), ws.getCell(r, 6)].forEach(cell => {
      applyCell(cell, { value: type, bold: true, size: 10, color: WHITE, fill: cfg.header, align: 'left', border: border() });
    });
    for (let c = 2; c <= 4; c++) applyCell(ws.getCell(r, c), { fill: cfg.header, border: border() });
    for (let c = 7; c <= 9; c++) applyCell(ws.getCell(r, c), { fill: cfg.header, border: border() });
    ws.mergeCells(r, 1, r, 4);
    ws.mergeCells(r, 6, r, 9);
    r++;

    const amRows = amByType[type];
    const pmRows = pmByType[type];
    const maxLen = Math.max(amRows.length, pmRows.length, 1);

    for (let i = 0; i < maxLen; i++) {
      ws.getRow(r).height = 16;
      const am = amRows[i];
      const pm = pmRows[i];
      const rowBg = i % 2 === 0 ? cfg.bg : cfg.accent;

      const amData = [am?.model || '', am?.storage || '', am?.color || '', am?.quantity ?? ''];
      const pmData = [pm?.model || '', pm?.storage || '', pm?.color || '', pm?.quantity ?? ''];

      amData.forEach((v, ci) => {
        const cell = ws.getCell(r, ci + 1);
        applyCell(cell, { value: v, fill: rowBg, align: ci === 3 ? 'center' : 'left', border: border('hair') });
        if (ci === 3 && v !== '') cell.font = { bold: true, size: 10 };
      });
      pmData.forEach((v, ci) => {
        const cell = ws.getCell(r, ci + 6);
        applyCell(cell, { value: v, fill: rowBg, align: ci === 3 ? 'center' : 'left', border: border('hair') });
        if (ci === 3 && v !== '') cell.font = { bold: true, size: 10 };
      });
      r++;
    }

    const amTotal = amRows.reduce((s, e) => s + (e.quantity || 0), 0);
    const pmTotal = pmRows.reduce((s, e) => s + (e.quantity || 0), 0);
    totals.am[type] = amTotal;
    totals.pm[type] = pmTotal;

    // Total row
    ws.getRow(r).height = 16;
    const totalData = [['Total', '', '', amTotal], ['Total', '', '', pmTotal]];
    [[1, totalData[0]], [6, totalData[1]]].forEach(([start, data]) => {
      data.forEach((v, ci) => {
        const cell = ws.getCell(r, start + ci);
        applyCell(cell, { value: v, bold: true, fill: TOTAL_ROW_BG, align: ci === 3 ? 'center' : 'left', border: border() });
      });
    });
    r++;
    r++; // gap
  }

  // ── Sold / Transfers section ──
  r++;
  ws.getRow(r).height = 20;
  const soldHeader = ws.getCell(r, 1);
  applyCell(soldHeader, { value: 'DAILY ACTIVITY', bold: true, size: 11, color: WHITE, fill: 'FFB91C1C', align: 'left', border: border() });
  ws.mergeCells(r, 1, r, 9);
  r++;

  const stockIns  = transfers.filter(t => t.transfer_type === 'stock_in');
  const pullOuts  = transfers.filter(t => t.transfer_type === 'pull_out');

  // Sold units detail
  ws.getRow(r).height = 16;
  ['Type', 'Model', 'Storage', 'Color', '', 'Qty', '', '', ''].forEach((h, i) => {
    if (!h) return;
    const cell = ws.getCell(r, i + 1);
    applyCell(cell, { value: h, bold: true, fill: MID_GRAY, align: 'center', border: border('hair') });
  });
  r++;

  soldEntries.forEach((s, idx) => {
    ws.getRow(r).height = 15;
    const bg = idx % 2 === 0 ? WHITE : LIGHT_GRAY;
    [s.unit_type, s.model, s.storage || '', s.color || '', '', s.quantity].forEach((v, i) => {
      const cell = ws.getCell(r, i + 1);
      applyCell(cell, { value: v, fill: bg, align: i === 5 ? 'center' : 'left', border: border('hair') });
    });
    r++;
  });

  if (soldEntries.length === 0) {
    const cell = ws.getCell(r, 1);
    applyCell(cell, { value: 'No sales recorded', italic: true, color: 'FF94A3B8', fill: WHITE, border: border('hair') });
    ws.mergeCells(r, 1, r, 9);
    r++;
  }

  // ── Summary ──
  r++;
  r++;
  ws.getRow(r).height = 22;
  const summaryHeader = ws.getCell(r, 1);
  applyCell(summaryHeader, { value: 'SUMMARY', bold: true, size: 12, color: WHITE, fill: DARK_HEADER, align: 'left', border: border() });
  ws.mergeCells(r, 1, r, 3);
  r++;

  const totalSold = soldEntries.reduce((s, e) => s + e.quantity, 0);
  const totalStockIn = stockIns.reduce((s, t) => s + t.quantity, 0);
  const totalPullOut = pullOuts.reduce((s, t) => s + t.quantity, 0);
  const grandTotal = Object.values(totals.pm).reduce((a, b) => a + b, 0);

  const summaryRows = [
    ['Brand New (iPhone) — Morning',   totals.am['Brand New (iPhone)'],   'FF1D6FA4'],
    ['Brand New (iPhone) — Evening',   totals.pm['Brand New (iPhone)'],   'FF1D6FA4'],
    ['Secondhand (iPhone) — Morning',  totals.am['Secondhand (iPhone)'],  'FFB45309'],
    ['Secondhand (iPhone) — Evening',  totals.pm['Secondhand (iPhone)'],  'FFB45309'],
    ['Android — Morning',              totals.am['Android'],              'FF166534'],
    ['Android — Evening',              totals.pm['Android'],              'FF166534'],
    ['iPad & MacBook — Morning',       totals.am['iPad & MacBook'],       'FF6B21A8'],
    ['iPad & MacBook — Evening',       totals.pm['iPad & MacBook'],       'FF6B21A8'],
    null,
    ['Total Stock In',   totalStockIn,  'FF0F766E'],
    ['Total Pull Out',   totalPullOut,  'FFB45309'],
    ['Total Sold',       totalSold,     'FFB91C1C'],
    null,
    ['Grand Total Units (Evening)', grandTotal, DARK_HEADER],
  ];

  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 14;

  for (const row of summaryRows) {
    ws.getRow(r).height = 16;
    if (!row) { r++; continue; }
    const [label, value, colorArgb] = row;
    const isGrand = label.startsWith('Grand');

    const lCell = ws.getCell(r, 1);
    const vCell = ws.getCell(r, 2);
    applyCell(lCell, {
      value: label, bold: isGrand, size: isGrand ? 11 : 10,
      color: isGrand ? WHITE : 'FF1E293B',
      fill: isGrand ? colorArgb : (r % 2 === 0 ? LIGHT_GRAY : WHITE),
      border: border('hair'),
    });
    applyCell(vCell, {
      value: value, bold: true, size: isGrand ? 11 : 10,
      color: isGrand ? WHITE : colorArgb,
      fill: isGrand ? colorArgb : (r % 2 === 0 ? LIGHT_GRAY : WHITE),
      align: 'center', border: border('hair'),
    });

    // Accent stripe on left
    const accentCell = ws.getCell(r, 3);
    accentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isGrand ? colorArgb : colorArgb + '40' } };
    accentCell.border = border('hair');
    r++;
  }

  return wb;
}

// ─── Sold Units Report ────────────────────────────────────────────────────────

async function buildSoldUnitsReport(year, month, allSoldByBranch, branches) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'F&J Gadgets Inventory';
  const ws = wb.addWorksheet(`Sold Units ${month}-${year}`, { views: [{ showGridLines: false }] });

  const BRANCH_COLORS = ['FF1D4ED8', 'FF0F766E', 'FFB45309', 'FF6B21A8', 'FFB91C1C', 'FF166534'];

  // Title
  ws.getRow(1).height = 26;
  const title = ws.getCell(1, 1);
  applyCell(title, {
    value: `Monthly Sold Units Report — ${month}/${year}`,
    bold: true, size: 13, color: WHITE, fill: DARK_HEADER, align: 'left', border: border(),
  });
  ws.mergeCells(1, 1, 1, branches.length * 3);

  let col = 1;
  for (let bi = 0; bi < branches.length; bi++) {
    const branch = branches[bi];
    const colorArgb = BRANCH_COLORS[bi % BRANCH_COLORS.length];
    const sold = allSoldByBranch[branch.id] || [];
    const byDate = {};
    sold.forEach(s => { byDate[s.date] = (byDate[s.date] || 0) + s.quantity; });
    const sortedDates = Object.keys(byDate).sort();

    ws.getRow(2).height = 20;
    const headerCell = ws.getCell(2, col);
    applyCell(headerCell, { value: branch.name, bold: true, size: 11, color: WHITE, fill: colorArgb, align: 'center', border: border() });
    ws.mergeCells(2, col, 2, col + 1);

    ws.getRow(3).height = 16;
    ['Date', 'Units Sold'].forEach((h, i) => {
      const cell = ws.getCell(3, col + i);
      applyCell(cell, { value: h, bold: true, fill: MID_GRAY, align: 'center', border: border() });
    });

    let dataRow = 4;
    let total = 0;
    for (const d of sortedDates) {
      ws.getRow(dataRow).height = 15;
      const bg = dataRow % 2 === 0 ? LIGHT_GRAY : WHITE;
      applyCell(ws.getCell(dataRow, col),     { value: d,          fill: bg, align: 'center', border: border('hair') });
      applyCell(ws.getCell(dataRow, col + 1), { value: byDate[d],  fill: bg, align: 'center', border: border('hair') });
      total += byDate[d];
      dataRow++;
    }

    if (sortedDates.length === 0) {
      applyCell(ws.getCell(dataRow, col), { value: 'No data', italic: true, color: 'FF94A3B8', fill: WHITE, border: border('hair') });
      ws.mergeCells(dataRow, col, dataRow, col + 1);
      dataRow++;
    }

    ws.getRow(dataRow).height = 17;
    applyCell(ws.getCell(dataRow, col),     { value: 'TOTAL', bold: true, fill: TOTAL_ROW_BG, align: 'center', border: border() });
    applyCell(ws.getCell(dataRow, col + 1), { value: total,   bold: true, fill: TOTAL_ROW_BG, align: 'center', border: border() });

    ws.getColumn(col).width = 14;
    ws.getColumn(col + 1).width = 13;
    ws.getColumn(col + 2).width = 3; // spacer
    col += 3;
  }

  return wb;
}

// ─── Stock Movement Report ────────────────────────────────────────────────────

async function buildStockMovementReport(year, month, transfers, branches) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'F&J Gadgets Inventory';
  const ws = wb.addWorksheet(`Stock Movement ${month}-${year}`, { views: [{ showGridLines: false }] });

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id] = b.name; });

  // Title
  ws.getRow(1).height = 26;
  const titleCell = ws.getCell(1, 1);
  applyCell(titleCell, {
    value: `Stock Movement Report — ${month}/${year}`,
    bold: true, size: 13, color: WHITE, fill: DARK_HEADER, align: 'left', border: border(),
  });
  ws.mergeCells(1, 1, 1, 10);

  // Column headers
  const headers = ['Date', 'Type', 'From / Source', 'To Branch', 'Unit Type', 'Model', 'Storage', 'Color', 'Qty', 'Note'];
  const widths  = [13, 12, 18, 18, 22, 26, 13, 14, 8, 20];
  ws.getRow(2).height = 18;
  headers.forEach((h, i) => {
    const cell = ws.getCell(2, i + 1);
    applyCell(cell, { value: h, bold: true, color: WHITE, fill: 'FF334155', align: 'center', border: border() });
    ws.getColumn(i + 1).width = widths[i];
  });

  const typeColors = { stock_in: 'FF0F766E', pull_out: 'FFB45309' };

  transfers.forEach((t, idx) => {
    const rowNum = idx + 3;
    ws.getRow(rowNum).height = 15;
    const isEven = idx % 2 === 0;
    const bg = isEven ? WHITE : LIGHT_GRAY;
    const typeLabel = t.transfer_type === 'stock_in' ? 'Stock In' : 'Pull Out';
    const typeColor = typeColors[t.transfer_type];

    const fromLabel = t.source_label || (t.from_branch_id ? branchMap[t.from_branch_id] : '—');
    const toLabel = t.to_branch_id ? branchMap[t.to_branch_id] : '—';

    const rowData = [
      { v: t.date,        align: 'center' },
      { v: typeLabel,     align: 'center', color: typeColor, bold: true },
      { v: fromLabel,     align: 'left' },
      { v: toLabel,       align: 'left' },
      { v: t.unit_type,   align: 'left' },
      { v: t.model,       align: 'left', bold: true },
      { v: t.storage || '', align: 'center' },
      { v: t.color || '',   align: 'center' },
      { v: t.quantity,    align: 'center', bold: true },
      { v: t.source_label && !t.from_branch_id && t.source_label !== 'Supplier' ? t.source_label : '', align: 'left' },
    ];

    rowData.forEach(({ v, align, color, bold: b }, i) => {
      const cell = ws.getCell(rowNum, i + 1);
      applyCell(cell, { value: v, fill: bg, align, color: color || 'FF1E293B', bold: !!b, border: border('hair') });
    });
  });

  if (transfers.length === 0) {
    const cell = ws.getCell(3, 1);
    applyCell(cell, { value: 'No transfers recorded for this period', italic: true, color: 'FF94A3B8', fill: WHITE, border: border('hair') });
    ws.mergeCells(3, 1, 3, 10);
  }

  return wb;
}

module.exports = { buildDailyInventoryReport, buildSoldUnitsReport, buildStockMovementReport };
