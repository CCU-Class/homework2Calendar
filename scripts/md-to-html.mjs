// scripts/md-to-html.js
import fs from 'fs-extra';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

// GitHub Markdown CSS CDN
const githubMarkdownCSS = `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.min.css">
<style>
  body {
    max-width: 800px;
    margin: 2rem auto;
    padding: 1rem;
  }
</style>
`;

function wrapWithTemplate(content, title) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  ${githubMarkdownCSS}
</head>
<body class="markdown-body">
${content}
</body>
</html>
`;
}

async function convertMarkdownFile(inputPath, outputPath, title) {
  const markdown = await fs.readFile(inputPath, 'utf-8');
  const htmlBody = md.render(markdown);
  const fullHTML = wrapWithTemplate(htmlBody, title);
  await fs.outputFile(outputPath, fullHTML);
  console.log(`✅ Converted: ${inputPath} → ${outputPath}`);
}

async function main() {
  await convertMarkdownFile('README.md', 'public/index.html', '作業同步工具');
  await convertMarkdownFile('privacy.md', 'public/privacy.html', '隱私權政策');
}

main();
