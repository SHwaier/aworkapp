const fs = require("fs");
const path = require("path");
const HTMLtoDOCX = require("html-to-docx");

const html = `
<h1>Alex Mercer</h1>
<p style="text-align: center;">alex.mercer@email.com | (555) 019-2834 | New York, NY</p>
<hr />
<h2>Professional Summary</h2>
<p>Highly motivated Software Engineer with 4+ years of experience building modern web applications. Skilled in React, Node.js, and TypeScript, with a strong focus on clean code and user experience.</p>
<h2>Skills</h2>
<ul>
  <li>Languages: JavaScript, TypeScript, HTML, CSS, SQL</li>
  <li>Frameworks: React, Next.js, Express, Tailwind CSS</li>
  <li>Tools: Git, Docker, MongoDB, AWS</li>
</ul>
<h2>Experience</h2>
<p><strong>Senior Software Engineer</strong> - TechCorp (2024 - Present)</p>
<ul>
  <li>Led development of a new analytics dashboard, improving loading speed by 40%.</li>
  <li>Mentored junior engineers and introduced automated testing practices.</li>
</ul>
<p><strong>Software Engineer</strong> - DevStudio (2022 - 2024)</p>
<ul>
  <li>Built responsive customer portals using React and Tailwind CSS.</li>
  <li>Designed and integrated REST APIs using Node.js and Express.</li>
</ul>
`;

HTMLtoDOCX(html, null, {
  table: { row: { cantSplit: true } },
  footer: true,
  header: true,
}).then((buffer) => {
  const outputPath = path.join(__dirname, "sample-resume.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log("Generated valid DOCX sample at:", outputPath);
  process.exit(0);
}).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
