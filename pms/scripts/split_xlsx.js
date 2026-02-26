const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function safeFilename(name) {
  const invalidChars = /[<>:\"/\\|?*\u0000-\u001F]/g;
  const cleaned = String(name).replace(invalidChars, '_').trim();
  return cleaned.length ? cleaned : 'sheet';
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function splitWorkbook(inputPath, outputDir, format = 'xlsx') {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`输入文件不存在: ${inputPath}`);
  }
  ensureDir(outputDir);

  const wb = xlsx.readFile(inputPath, { cellDates: true });
  const sheetNames = wb.SheetNames || [];
  if (sheetNames.length === 0) {
    console.log('工作簿不包含任何工作表');
    return;
  }

  let count = 0;
  sheetNames.forEach((name) => {
    const sheet = wb.Sheets[name];
    const safeName = safeFilename(name);
    const base = path.join(outputDir, safeName);

    if (format === 'csv') {
      const csv = xlsx.utils.sheet_to_csv(sheet);
      const outPath = `${base}.csv`;
      fs.writeFileSync(outPath, csv, 'utf8');
      console.log(`已生成: ${outPath}`);
      count++;
      return;
    }

    const newWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWb, sheet, safeName);
    const outPath = `${base}.xlsx`;
    xlsx.writeFile(newWb, outPath);
    console.log(`已生成: ${outPath}`);
    count++;
  });

  console.log(`完成，共拆分 ${count} 个工作表 -> ${format.toUpperCase()} 文件`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('用法: node scripts/split_xlsx.js <输入xlsx路径> [输出目录] [格式:xlsx|csv]');
    process.exit(1);
  }
  const inputPath = path.resolve(args[0]);
  const outputDir = path.resolve(args[1] || path.join(path.dirname(inputPath), 'split_sheets'));
  const format = (args[2] || 'xlsx').toLowerCase();
  if (!['xlsx', 'csv'].includes(format)) {
    console.error('格式仅支持 xlsx 或 csv');
    process.exit(1);
  }

  try {
    splitWorkbook(inputPath, outputDir, format);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
