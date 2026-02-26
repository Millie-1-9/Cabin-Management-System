const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const TurndownService = require('turndown');

function convertDocxToMarkdown(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`输入文件不存在: ${inputPath}`);
  }
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  td.addRule('tableCleanup', {
    filter: ['table'],
    replacement: (content) => content,
  });

  return mammoth.convertToHtml({ path: inputPath }, { styleMap: [] })
    .then((result) => {
      const html = result.value || '';
      const md = td.turndown(html);
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outputPath, md, 'utf8');
      return { outputPath, messages: result.messages || [] };
    });
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('用法: node scripts/docx_to_md.js <输入docx路径> [输出md路径]');
    process.exit(1);
  }
  const inputPath = path.resolve(args[0]);
  let outputPath = args[1]
    ? path.resolve(args[1])
    : path.resolve(path.dirname(inputPath), path.basename(inputPath, path.extname(inputPath)) + '.md');

  convertDocxToMarkdown(inputPath, outputPath)
    .then(({ outputPath }) => {
      console.log(`已生成 Markdown: ${outputPath}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error(e.message || e);
      process.exit(1);
    });
}

if (require.main === module) {
  main();
}
