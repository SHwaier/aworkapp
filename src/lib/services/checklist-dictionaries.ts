/**
 * Curated keyword dictionaries and action verb banks for the resume checklist
 * analysis engine. These are pure data — no imports or side effects.
 */

// ============================================
// Technical Keywords Dictionary (~300 terms)
// ============================================

export const TECH_KEYWORDS: Record<string, string[]> = {
  // Programming Languages
  programming_languages: [
    "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#",
    "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "Dart",
    "R", "MATLAB", "Perl", "Lua", "Haskell", "Elixir", "Clojure",
    "Objective-C", "Assembly", "Bash", "Shell", "PowerShell", "SQL",
    "HTML", "CSS", "Sass", "SCSS", "Less",
  ],

  // Frontend Frameworks & Libraries
  frontend: [
    "React", "Next.js", "Angular", "Vue", "Vue.js", "Svelte", "SvelteKit",
    "Nuxt", "Nuxt.js", "Gatsby", "Remix", "Astro", "Solid", "SolidJS",
    "jQuery", "Bootstrap", "Tailwind", "TailwindCSS", "Material UI", "MUI",
    "Chakra UI", "Ant Design", "Styled Components", "Emotion",
    "Redux", "Zustand", "MobX", "Recoil", "Jotai", "Valtio",
    "React Query", "TanStack Query", "SWR",
    "Framer Motion", "GSAP", "Three.js", "D3.js", "Chart.js",
    "Storybook", "Webpack", "Vite", "Parcel", "Rollup", "esbuild",
    "Babel", "ESLint", "Prettier",
  ],

  // Backend Frameworks & Libraries
  backend: [
    "Node.js", "Express", "Express.js", "Fastify", "NestJS", "Koa",
    "Django", "Flask", "FastAPI", "Spring", "Spring Boot",
    "Rails", "Ruby on Rails", "Laravel", "Symfony",
    "ASP.NET", ".NET", ".NET Core",
    "GraphQL", "Apollo", "REST", "RESTful", "gRPC", "WebSocket",
    "Prisma", "Drizzle", "Sequelize", "TypeORM", "Mongoose", "Knex",
    "JWT", "OAuth", "Auth0", "Passport",
  ],

  // Databases
  databases: [
    "MongoDB", "PostgreSQL", "MySQL", "MariaDB", "SQLite",
    "Redis", "Memcached", "Elasticsearch",
    "DynamoDB", "Cassandra", "CockroachDB", "Neo4j",
    "Firebase", "Firestore", "Supabase", "PlanetScale",
    "SQL Server", "Oracle", "Aurora",
  ],

  // Cloud & DevOps
  cloud_devops: [
    "AWS", "Amazon Web Services", "Azure", "Google Cloud", "GCP",
    "Vercel", "Netlify", "Heroku", "DigitalOcean", "Cloudflare",
    "Docker", "Kubernetes", "K8s", "Terraform", "Ansible", "Pulumi",
    "CI/CD", "GitHub Actions", "GitLab CI", "Jenkins", "CircleCI",
    "Travis CI", "ArgoCD",
    "Linux", "Ubuntu", "Nginx", "Apache",
    "Serverless", "Lambda", "EC2", "S3", "CloudFront", "ECS", "EKS",
    "Fargate", "RDS", "SQS", "SNS", "EventBridge",
  ],

  // Tools
  tools: [
    "Git", "GitHub", "GitLab", "Bitbucket",
    "Jira", "Confluence", "Trello", "Asana", "Monday.com",
    "Slack", "Microsoft Teams", "Notion", "Linear",
    "Figma", "Sketch", "Adobe XD", "InVision", "Zeplin",
    "Postman", "Insomnia", "Swagger",
    "VS Code", "IntelliJ", "WebStorm", "Vim", "Neovim",
    "npm", "yarn", "pnpm", "Homebrew",
    "Datadog", "New Relic", "Grafana", "Prometheus", "Sentry",
    "Splunk", "PagerDuty",
  ],

  // Testing
  testing: [
    "Jest", "Mocha", "Chai", "Jasmine",
    "Cypress", "Playwright", "Puppeteer", "Selenium", "WebDriver",
    "Testing Library", "React Testing Library", "Enzyme",
    "Vitest", "Supertest",
    "JUnit", "pytest", "RSpec",
    "TDD", "BDD", "E2E", "Unit Testing", "Integration Testing",
    "Load Testing", "Performance Testing", "A/B Testing",
  ],

  // Data & AI/ML
  data_ai: [
    "Machine Learning", "Deep Learning", "AI", "Artificial Intelligence",
    "NLP", "Natural Language Processing", "Computer Vision",
    "TensorFlow", "PyTorch", "Keras", "scikit-learn", "OpenCV",
    "Pandas", "NumPy", "Matplotlib", "Jupyter",
    "Spark", "Hadoop", "Kafka", "Airflow",
    "ETL", "Data Pipeline", "Data Engineering", "Data Science",
    "Power BI", "Tableau", "Looker",
    "OpenAI", "GPT", "LLM", "RAG", "LangChain",
  ],

  // Mobile
  mobile: [
    "React Native", "Flutter", "SwiftUI", "Jetpack Compose",
    "Xamarin", "Ionic", "Capacitor", "Expo",
    "iOS", "Android", "Mobile Development",
    "App Store", "Google Play", "TestFlight",
  ],

  // Security
  security: [
    "Cybersecurity", "InfoSec", "OWASP", "Penetration Testing",
    "Encryption", "SSL", "TLS", "HTTPS",
    "RBAC", "SSO", "SAML", "MFA", "2FA",
    "SOC 2", "GDPR", "HIPAA", "PCI DSS",
    "Vulnerability Assessment", "Security Audit",
  ],
};

// ============================================
// Soft Skills Dictionary
// ============================================

export const SOFT_SKILLS = [
  "communication", "leadership", "teamwork", "collaboration",
  "problem-solving", "problem solving", "critical thinking",
  "time management", "project management", "organization",
  "adaptability", "flexibility", "creativity", "innovation",
  "attention to detail", "analytical", "strategic thinking",
  "interpersonal", "mentoring", "coaching",
  "customer service", "client relations", "stakeholder management",
  "presentation", "public speaking", "negotiation",
  "decision making", "conflict resolution", "emotional intelligence",
  "self-motivated", "self-starter", "initiative",
  "multitasking", "prioritization", "delegation",
  "accountability", "reliability", "professionalism",
  "cross-functional", "agile", "scrum", "kanban",
];

// ============================================
// Standard Resume Section Headers
// ============================================

export const STANDARD_SECTION_HEADERS = [
  "Education", "Experience", "Work Experience", "Professional Experience",
  "Projects", "Personal Projects", "Technical Projects",
  "Skills", "Technical Skills", "Core Competencies",
  "Certifications", "Certificates", "Licenses",
  "Awards", "Honors", "Achievements",
  "Volunteer Experience", "Volunteering", "Community Service",
  "Leadership", "Leadership Experience",
  "Extracurricular Activities", "Activities",
  "Publications", "Research",
  "Summary", "Professional Summary", "Objective",
  "Languages", "Interests",
];

export const NON_STANDARD_SECTION_HEADERS = [
  "My Journey", "Things I Built", "Where I've Been",
  "Superpowers", "Tech Stack Magic", "About Me",
  "Cool Stuff", "What I Do", "My Toolbox",
  "Adventures", "Passions", "Fun Facts",
];

// ============================================
// Weak Verbs / Duty Phrases to Detect
// ============================================

export const WEAK_VERB_PATTERNS = [
  "responsible for",
  "helped with",
  "worked on",
  "assisted with",
  "was involved in",
  "participated in",
  "tasked with",
  "in charge of",
  "handled",
  "dealt with",
  "did",
  "made",
  "used",
];

// ============================================
// Action Verb Bank (from feature1.md §10)
// ============================================

export const ACTION_VERBS: Record<string, string[]> = {
  created_or_wrote: [
    "Acted", "Adapted", "Combined", "Composed", "Conceptualized",
    "Condensed", "Created", "Customized", "Designed", "Developed",
    "Devised", "Directed", "Displayed", "Established", "Fashioned",
    "Formulated", "Founded", "Illustrated", "Initiated", "Instituted",
    "Integrated", "Introduced", "Invented", "Modeled", "Modified",
    "Originated", "Planned", "Revised", "Revitalized", "Shaped", "Solved",
  ],

  research_and_analysis: [
    "Analyzed", "Clarified", "Collected", "Compared", "Conducted",
    "Critiqued", "Detected", "Determined", "Diagnosed", "Evaluated",
    "Examined", "Experimented", "Explored", "Extracted", "Formulated",
    "Gathered", "Identified", "Inspected", "Interpreted", "Interviewed",
    "Investigated", "Located", "Measured", "Organized", "Researched",
    "Reviewed", "Searched", "Solved", "Summarized", "Surveyed",
    "Systematized",
  ],

  managed_project_or_group: [
    "Accomplished", "Administered", "Advanced", "Appointed", "Approved",
    "Assigned", "Attained", "Authorized", "Chaired", "Consolidated",
    "Contracted", "Controlled", "Converted", "Coordinated", "Decided",
    "Delegated", "Developed", "Directed", "Eliminated", "Emphasized",
    "Enforced", "Enhanced", "Established", "Executed", "Generated",
    "Handled", "Headed", "Hosted", "Improved", "Incorporated",
    "Increased", "Initiated", "Instituted", "Led", "Managed", "Merged",
    "Motivated", "Navigated", "Organized", "Overhauled", "Oversaw",
    "Planned", "Presided", "Prioritized", "Produced", "Recommended",
    "Reorganized", "Replaced", "Restored", "Reviewed", "Scheduled",
    "Secured", "Selected", "Streamlined", "Strengthened", "Supervised",
  ],

  numbers_metrics_finance: [
    "Administered", "Adjusted", "Allocated", "Analyzed", "Appraised",
    "Assessed", "Audited", "Balanced", "Budgeted", "Calculated",
    "Computed", "Conserved", "Controlled", "Corrected", "Decreased",
    "Determined", "Developed", "Estimated", "Forecasted", "Managed",
    "Marketed", "Measured", "Netted", "Planned", "Prepared",
    "Programmed", "Projected", "Qualified", "Reconciled", "Reduced",
    "Researched", "Retrieved",
  ],

  helped_or_supported: [
    "Adapted", "Advocated", "Aided", "Answered", "Arranged",
    "Assessed", "Assisted", "Clarified", "Coached", "Collaborated",
    "Contributed", "Cooperated", "Counseled", "Demonstrated",
    "Diagnosed", "Educated", "Encouraged", "Ensured", "Expedited",
    "Facilitated", "Familiarized", "Furthered", "Guided", "Helped",
    "Motivated", "Prevented", "Provided", "Referred", "Represented",
    "Resolved", "Simplified", "Supplied", "Supported", "Volunteered",
  ],

  technical_work: [
    "Adapted", "Applied", "Assembled", "Built", "Calculated",
    "Computed", "Constructed", "Converted", "Debugged", "Designed",
    "Determined", "Developed", "Engineered", "Fabricated", "Installed",
    "Maintained", "Operated", "Overhauled", "Programmed", "Rectified",
    "Regulated", "Remodeled", "Repaired", "Replaced", "Restored",
    "Solved", "Specialized", "Standardized", "Studied", "Upgraded",
    "Utilized",
  ],

  teaching_mentoring_training: [
    "Adapted", "Advised", "Clarified", "Coached", "Communicated",
    "Conducted", "Coordinated", "Critiqued", "Developed", "Enabled",
    "Encouraged", "Evaluated", "Explained", "Facilitated", "Focused",
    "Guided", "Individualized", "Informed", "Instructed", "Motivated",
    "Persuaded", "Simulated", "Stimulated", "Taught", "Tested",
    "Trained", "Transmitted", "Tutored",
  ],
};

/**
 * Flat set of all action verbs (lowercased) for fast lookup.
 */
export const ALL_ACTION_VERBS_SET: Set<string> = new Set(
  Object.values(ACTION_VERBS)
    .flat()
    .map((v) => v.toLowerCase())
);

/**
 * Flat set of all tech keywords (lowercased) for fast lookup.
 */
export const ALL_TECH_KEYWORDS_SET: Set<string> = new Set(
  Object.values(TECH_KEYWORDS)
    .flat()
    .map((k) => k.toLowerCase())
);

/**
 * Map from lowercase keyword → its display-cased form.
 */
export const TECH_KEYWORD_DISPLAY: Map<string, string> = new Map(
  Object.values(TECH_KEYWORDS)
    .flat()
    .map((k) => [k.toLowerCase(), k] as [string, string])
);

/**
 * Map from lowercase keyword → its category.
 */
export const TECH_KEYWORD_CATEGORY: Map<string, string> = new Map(
  Object.entries(TECH_KEYWORDS).flatMap(([category, keywords]) =>
    keywords.map((k) => [k.toLowerCase(), category] as [string, string])
  )
);
