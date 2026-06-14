// 临时脚本：读取docx文件内容（修复编码）
const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

// 设置控制台编码为UTF-8
try { execSync('chcp 65001', { stdio: 'ignore' }); } catch(e){}

const docxPath = path.join(__dirname, '..', '测试用例与需求调整.docx');
const tempDir = path.join(os.tmpdir(), 'docx_extract_' + Date.now());

try {
  fs.mkdirSync(tempDir, { recursive: true });
  const zipPath = tempDir + '.zip';
  fs.copyFileSync(docxPath, zipPath);
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`, { stdio: 'ignore' });

  const xmlPath = path.join(tempDir, 'word', 'document.xml');
  const xml = fs.readFileSync(xmlPath, 'utf-8');

  // 按 <w:p> 分段提取文本
  const paragraphs = xml.split(/<w:p[ >]/);
  const lines = [];
  for (const para of paragraphs) {
    const paraTexts = [];
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m;
    while ((m = tRegex.exec(para)) !== null) {
      // 解码XML实体
      let text = m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      paraTexts.push(text);
    }
    const line = paraTexts.join('');
    lines.push(line);
  }

  const output = lines.join('\n');
  // 写入文件以避免控制台编码问题
  const outPath = path.join(__dirname, '..', 'docx-content.txt');
  fs.writeFileSync(outPath, output, 'utf-8');
  console.log('Content written to: ' + outPath);
  console.log('Total lines: ' + lines.length);
} catch (e) {
  console.error('Error:', e.message);
}
