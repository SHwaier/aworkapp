/**
 * Fictional resume/job pairs for the AI evaluation (npm run eval:ai).
 * Each case has a first resume, an improved second version, and ground truth:
 * - met: terms the v1 resume clearly demonstrates in its experience
 * - missing: terms neither version shows anywhere
 * - addedInV2: terms v1 lacks and v2 demonstrates
 * A term may list alternatives ("mentor|mentoring") since the model words requirements freely.
 * Job descriptions include typical boilerplate (company blurb, benefits, EEO).
 */
export interface EvalCase {
  id: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  resumeV1: string;
  resumeV2: string;
  truth: { met: string[]; missing: string[]; addedInV2: string[] };
}

const backendV1 = `Jordan Rivera
jordan.rivera@example.com | (555) 010-2233 | linkedin.com/in/jordanrivera-example
Summary
Backend engineer with 5 years building data-heavy web services.
Experience
Senior Software Engineer, Northwind Analytics (2021 - Present)
Built a Node.js and TypeScript ingestion service processing 2M events per day.
Led migration of reporting jobs from cron scripts to a queue-based worker system.
Mentored three junior engineers through code review and pairing.
Software Engineer, Contoso Retail (2019 - 2021)
Developed REST APIs in Python (Django) backed by PostgreSQL.
Reduced checkout page load time by 35% by adding Redis caching.
Education
B.S. Computer Science, State University
Skills
TypeScript, Node.js, Python, Django, PostgreSQL, Redis, Docker, Git`;

const backendV2 = backendV1
  .replace(
    "Led migration of reporting jobs from cron scripts to a queue-based worker system.",
    "Moved reporting jobs from cron scripts to AWS Lambda workers fed by SQS, cutting failed runs by 60%.\nDesigned the event schema for a Kafka pipeline shared by four product teams."
  )
  .replace("Redis, Docker, Git", "Redis, Docker, Git, AWS (Lambda, SQS), Kafka");

const frontendV1 = `Priya Shah
priya.shah@example.com | (555) 014-9087 | github.com/priyashah-example
Experience
Frontend Developer, Brightline Health (2022 - Present)
Rebuilt the patient intake flow in React and TypeScript, raising completion from 61% to 78%.
Created a shared component library used by 4 product teams.
Wrote unit tests with Jest and React Testing Library for core booking screens.
Junior Web Developer, Pixel & Co (2020 - 2022)
Built marketing sites with HTML, CSS, and JavaScript for 15 small-business clients.
Education
B.A. Interactive Media, Lakeside College
Skills
React, TypeScript, JavaScript, HTML, CSS, Jest, Figma`;

const frontendV2 = frontendV1
  .replace(
    "Created a shared component library used by 4 product teams.",
    "Created a shared component library used by 4 product teams, meeting WCAG 2.1 AA accessibility standards.\nMoved the booking app to Next.js server rendering, cutting first contentful paint from 3.1s to 1.4s."
  )
  .replace("Jest, Figma", "Jest, Figma, Next.js, accessibility (WCAG)");

const dataV1 = `Marcus Lee
marcus.lee@example.com | (555) 017-3321
Summary
Data analyst with 3 years turning sales and operations data into weekly decisions.
Experience
Data Analyst, Fairway Logistics (2022 - Present)
Wrote SQL queries in PostgreSQL to track delivery times across 40 depots.
Built Tableau dashboards used by regional managers in weekly planning.
Automated a monthly cost report in Excel, saving the finance team 6 hours a month.
Operations Associate, Fairway Logistics (2021 - 2022)
Cleaned and reconciled shipment records for 12,000 orders a month.
Education
B.S. Economics, Riverside University
Skills
SQL, PostgreSQL, Tableau, Excel`;

const dataV2 = dataV1
  .replace(
    "Automated a monthly cost report in Excel, saving the finance team 6 hours a month.",
    "Automated a monthly cost report with Python (pandas), saving the finance team 6 hours a month.\nRan an A/B test of two routing rules across 8 depots, cutting late deliveries by 9%."
  )
  .replace("Tableau, Excel", "Tableau, Excel, Python, pandas, A/B testing");

const marketingV1 = `Elena Novak
elena.novak@example.com | (555) 012-4450 | linkedin.com/in/elenanovak-example
Experience
Marketing Coordinator, Harbor Outdoor Gear (2021 - Present)
Ran the weekly email newsletter in Mailchimp for 48,000 subscribers, lifting open rates from 21% to 29%.
Planned Instagram and TikTok content calendars for three product launches.
Wrote product copy for 120 items on the Shopify store.
Marketing Intern, Cedar Books (2020)
Coordinated a spring author event with 300 attendees.
Education
B.A. Communications, Northgate University
Skills
Mailchimp, Shopify, Canva, copywriting, social media`;

const marketingV2 = marketingV1
  .replace(
    "Wrote product copy for 120 items on the Shopify store.",
    "Wrote product copy for 120 items on the Shopify store, using Google Analytics to rework the 10 lowest-converting pages.\nManaged a $15,000 Google Ads budget for the fall launch at a 4.2x return on ad spend."
  )
  .replace("copywriting, social media", "copywriting, social media, Google Analytics, Google Ads");

const BOILERPLATE = (company: string) => `
About ${company}
${company} has grown every year since it was founded, and we're proud of a culture built on curiosity and kindness. Our offices are dog-friendly.

What we offer
- Competitive salary and equity
- Health, dental, and vision insurance from day one
- 4 weeks of paid vacation and a yearly learning budget
- Flexible hybrid work

${company} is an equal opportunity employer. We do not discriminate on the basis of race, religion, color, national origin, sex, sexual orientation, gender identity, age, disability, or veteran status. If you need a reasonable accommodation during the hiring process, email us.`;

export const EVAL_CASES: EvalCase[] = [
  {
    id: "backend",
    jobTitle: "Senior Backend Engineer",
    companyName: "Example Co",
    jobDescription: `Senior Backend Engineer
We are looking for a Senior Backend Engineer to build the services behind our analytics product.

Requirements:
- 5+ years of backend development experience
- Strong TypeScript and Node.js skills
- Experience with PostgreSQL and data modeling
- Experience with AWS (Lambda, SQS, DynamoDB)
- Kubernetes in production

Nice to have:
- Experience mentoring engineers
- Event-driven architecture (Kafka or similar)
${BOILERPLATE("Example Co")}`,
    resumeV1: backendV1,
    resumeV2: backendV2,
    truth: {
      met: ["TypeScript", "PostgreSQL", "mentor|mentoring|mentorship"],
      missing: ["Kubernetes"],
      addedInV2: ["Kafka"],
    },
  },
  {
    id: "frontend",
    jobTitle: "Frontend Engineer",
    companyName: "Lumen Learning",
    jobDescription: `About the role
Lumen Learning is hiring a Frontend Engineer to build the student dashboard used by 2 million learners.

What you'll do
- Build and maintain React and TypeScript features in our Next.js app
- Make every screen accessible (WCAG 2.1 AA)
- Write tests and review code with the team

What we're looking for
- 3+ years building production web apps with React
- Strong TypeScript
- Experience with Next.js or another server-rendering framework
- Knowledge of web accessibility
- Experience with GraphQL
- Bonus: experience with Storybook or design systems
${BOILERPLATE("Lumen Learning")}`,
    resumeV1: frontendV1,
    resumeV2: frontendV2,
    truth: {
      met: ["React", "TypeScript"],
      missing: ["GraphQL"],
      addedInV2: ["Next.js|server-rendering|server rendering", "WCAG|accessibility|accessible"],
    },
  },
  {
    id: "data",
    jobTitle: "Data Analyst",
    companyName: "Pinecrest Grocers",
    jobDescription: `Data Analyst, Supply Chain
Join Pinecrest Grocers' analytics team and help 200 stores keep shelves full.

Responsibilities:
- Write SQL to analyze inventory and delivery data
- Build and maintain dashboards in Tableau or Power BI
- Design and analyze experiments (A/B tests) on ordering rules
- Present findings to store operations leaders

Qualifications:
- 2+ years in a data analyst role
- Advanced SQL
- Python for data analysis (pandas)
- Experience with Tableau or Power BI
- Familiarity with dbt or Snowflake is a plus
${BOILERPLATE("Pinecrest Grocers")}`,
    resumeV1: dataV1,
    resumeV2: dataV2,
    truth: {
      met: ["SQL", "Tableau"],
      missing: ["Snowflake|dbt"],
      addedInV2: ["pandas|Python", "A/B|experiment|experiments"],
    },
  },
  {
    id: "marketing",
    jobTitle: "Digital Marketing Specialist",
    companyName: "Trailhead Coffee",
    jobDescription: `Digital Marketing Specialist
Trailhead Coffee is looking for a hands-on marketer to grow our online store.

In this role you will:
- Own email marketing campaigns and automations
- Plan and publish social media content
- Run paid search campaigns in Google Ads
- Report on performance using Google Analytics

You have:
- 2+ years of digital marketing experience, ideally in e-commerce
- Experience with an email platform such as Mailchimp or Klaviyo
- Hands-on Google Ads experience
- Comfort with Google Analytics
- Experience with SEO
- Strong writing skills
${BOILERPLATE("Trailhead Coffee")}`,
    resumeV1: marketingV1,
    resumeV2: marketingV2,
    truth: {
      met: ["Mailchimp|email", "social media|social"],
      missing: ["SEO"],
      addedInV2: ["Google Ads"],
    },
  },
];
