import {
  type ActionFunctionArgs,
  unstable_composeUploadHandlers as composeUploadHandlers,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  json,
  type LoaderFunctionArgs,
  unstable_parseMultipartFormData as parseMultipartFormData,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import { match } from 'ts-pattern';

import { reviewResume } from '@oyster/core/resumes';
import {
  Button,
  cx,
  Divider,
  FileUploader,
  Form,
  MB_IN_BYTES,
  Modal,
  Text,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);
  const { experiences, projects } = {
    experiences: [
      {
        company: 'JPMorgan Chase & Co.',
        role: 'Software Engineer Intern',
        date: 'Jun. 2024 - Aug. 2024',
        feedback:
          'Strong experience with good technical details. Consider quantifying impact more.',
        score: 4,
        bullets: [
          {
            content:
              'Extracted and transformed interaction data from 5,000+ users in a Java RMI Application via a Java Swing GUI Popup to prioritize features for migration to a scalable React Web Application.',
            feedback: 'Good technical detail, but could be more concise.',
            number: 1,
            rewrites: [
              'Migrated 5,000+ user interactions from Java RMI to React, prioritizing features via Java Swing GUI analysis.',
              'Transformed interaction data for 5,000+ users, facilitating Java to React migration with prioritized features.',
            ],
            suggestions:
              'Quantify the impact of the migration on performance or user experience.',
            score: 4,
          },
          {
            content:
              'Loaded the data into an Oracle Database hosted on AWS RDS using SQL Queries via the JDBC API.',
            feedback:
              'Clear and concise, but could highlight more technical complexity or impact.',
            number: 2,
            rewrites: [
              'Engineered data pipeline to load user data into AWS RDS Oracle Database using JDBC API and optimized SQL queries.',
              'Implemented efficient data loading process from Java application to AWS RDS using JDBC, optimizing for scalability.',
            ],
            suggestions:
              'Mention any performance improvements or data volume handled.',
            score: 3,
          },
          {
            content:
              "Led the team's React learning initiative by creating a comprehensive Confluence page and implemented an XML to JSON conversion component, enhancing data interoperability.",
            feedback: 'Good leadership and technical implementation mentioned.',
            number: 3,
            rewrites: [
              "Spearheaded team's React adoption, creating comprehensive documentation and XML-to-JSON converter for enhanced data interoperability.",
              'Led React learning initiative and developed XML-to-JSON component, improving team productivity and data handling.',
            ],
            suggestions:
              'Quantify the impact on team productivity or project timeline.',
            score: 4,
          },
          {
            content:
              'Implemented Jest Unit Tests and Cypress E2E Tests (70% Coverage) and generated associated xml reports.',
            feedback: 'Good mention of testing frameworks and coverage.',
            number: 4,
            rewrites: [
              'Achieved 70% test coverage implementing Jest unit and Cypress E2E tests, enhancing code reliability and generating XML reports.',
              'Boosted code quality with comprehensive Jest and Cypress testing suite, reaching 70% coverage and automating XML report generation.',
            ],
            suggestions:
              'Mention any bugs caught or improvements in development process due to testing.',
            score: 4,
          },
        ],
      },
      {
        company: 'Prudential Financial',
        role: 'Software Engineer Co-Op',
        date: 'Jan. 2024 - May 2024',
        feedback:
          'Good experience with clear impact. Could use more technical details.',
        score: 4,
        bullets: [
          {
            content:
              'Saved roughly 4-6 hours per use in production by developing an XML-based one-click automated solution that unblocks a queue of stalled actuarial sensitivity runs.',
            feedback:
              'Excellent quantification of impact. Good technical detail.',
            number: 1,
            rewrites: [
              'Developed XML-based automation tool, reducing actuarial sensitivity run times by 4-6 hours per use and unblocking production queues.',
              'Engineered one-click XML solution to streamline actuarial processes, saving 4-6 production hours per execution.',
            ],
            suggestions:
              'Mention the technology stack used for the automation tool.',
            score: 5,
          },
          {
            content:
              'Developed Python scripts that extract matching log entries via regex, transform the data using pandas, and load the data to excel, making hundreds of log files digestible. Tested using pytest.',
            feedback:
              'Good mention of technologies used and the scale of the problem.',
            number: 2,
            rewrites: [
              'Engineered Python ETL pipeline using regex and pandas to process hundreds of log files, with pytest validation for data integrity.',
              'Created Python scripts to extract, transform (using pandas), and load log data to Excel, processing hundreds of files with pytest-driven testing.',
            ],
            suggestions:
              'Quantify the time saved or improvement in data analysis capabilities.',
            score: 4,
          },
          {
            content:
              'Refactored an existing Python-based AWS Secure File Transfer Protocol script to leverage the AsyncSSH and AsyncIO packages, allowing for concurrent SSH operations.',
            feedback:
              'Good mention of specific technologies and performance improvement.',
            number: 3,
            rewrites: [
              'Optimized AWS SFTP script using AsyncSSH and AsyncIO, enabling concurrent operations and improving file transfer efficiency.',
              'Refactored Python-based AWS SFTP script to utilize AsyncSSH and AsyncIO, significantly enhancing concurrent SSH capabilities.',
            ],
            suggestions:
              'Quantify the performance improvement achieved by the refactoring.',
            score: 4,
          },
        ],
      },
      {
        company: 'JPMorgan Chase & Co.',
        role: 'Software Engineer Intern',
        date: 'Jun. 2023 - Aug. 2023',
        feedback:
          'Strong experience with good technical details and quantifiable results.',
        score: 5,
        bullets: [
          {
            content:
              "Halved the initial render time of a client-facing React Web Application that serves 1 million monthly users by utilizing Next.js's configurations & its different rendering techniques.",
            feedback:
              'Excellent quantification of impact and clear technical approach.',
            number: 1,
            rewrites: [
              'Optimized React Web App serving 1M monthly users, halving initial render time through Next.js configurations and advanced rendering techniques.',
              'Reduced load time by 50% for 1M-user React app by implementing Next.js optimizations and custom rendering strategies.',
            ],
            suggestions:
              'Mention specific Next.js techniques used (e.g., SSR, ISR).',
            score: 5,
          },
          {
            content:
              'Refactored in-house React Components and Hooks to ensure compatibility with Next.js and tested them via Storybook, Unit Tests (100% Jest coverage), and Cypress E2E Testing.',
            feedback: 'Good mention of testing frameworks and coverage.',
            number: 2,
            rewrites: [
              'Reengineered React components for Next.js compatibility, achieving 100% Jest coverage and comprehensive Storybook and Cypress E2E testing.',
              'Modernized React codebase for Next.js, implementing rigorous testing with 100% Jest coverage, Storybook, and Cypress E2E.',
            ],
            suggestions:
              'Mention any performance improvements or bug reductions achieved.',
            score: 4,
          },
          {
            content:
              'Developed and Cloud-deployed one React and several Next.js Web Applications in order to compare performance after introducing Server-side Rendering and Static Site Generation.',
            feedback:
              'Good comparison of technologies, but could be more specific about results.',
            number: 3,
            rewrites: [
              'Deployed and benchmarked multiple React and Next.js apps to quantify performance gains from Server-side Rendering and Static Site Generation.',
              'Conducted performance analysis on cloud-deployed React vs Next.js applications, focusing on SSR and SSG benefits.',
            ],
            suggestions:
              'Provide specific performance metrics from the comparison.',
            score: 4,
          },
          {
            content:
              'Won a company-wide hackathon by developing a React/Bootstrap and Java Springboot Web Application to facilitate knowledge sharing and networking among employees over lunch.',
            feedback:
              'Impressive achievement, but could use more technical details.',
            number: 4,
            rewrites: [
              'Clinched company hackathon with React/Bootstrap frontend and Java Spring Boot backend app for employee lunch networking.',
              'Developed award-winning React/Java Spring Boot web app in company hackathon, enhancing employee knowledge sharing.',
            ],
            suggestions:
              'Mention any unique features or technologies that contributed to winning.',
            score: 4,
          },
        ],
      },
    ],
    projects: [
      {
        title: 'Pokédex',
        feedback:
          'Impressive project with good use of modern web technologies.',
        score: 4,
        bullets: [
          {
            content:
              "Developed a Web Application in order to solidify my knowledge of Next.js's capabilities.",
            feedback:
              'Good initiative, but could be more specific about features implemented.',
            number: 1,
            rewrites: [
              'Engineered a Next.js-powered Pokédex web app to deepen understanding of SSR, ISR, and API routes.',
              'Created feature-rich Pokédex using Next.js, showcasing advanced framework capabilities and optimizations.',
            ],
            suggestions:
              'Mention specific Next.js features or optimizations implemented.',
            score: 3,
          },
          {
            content:
              'Utilized a RESTful API to fetch a list of 151 Pokémon and information on requested Pokémon.',
            feedback:
              'Clear use of API, but could elaborate on implementation details.',
            number: 2,
            rewrites: [
              'Integrated PokéAPI RESTful service to dynamically fetch and display data for 151 Pokémon, optimizing API calls.',
              'Implemented efficient data fetching for 151 Pokémon using RESTful API, with caching for improved performance.',
            ],
            suggestions:
              'Mention any optimizations in API usage or data management.',
            score: 4,
          },
          {
            content:
              "Filtered the list of Pokémon via monitoring a search field's value and a useState React Hook.",
            feedback:
              'Good mention of React concepts, but could be more impactful.',
            number: 3,
            rewrites: [
              "Engineered real-time Pokémon filtering using React's useState and dynamic search field monitoring for enhanced UX.",
              'Implemented responsive Pokémon search functionality with React hooks, providing instant results as users type.',
            ],
            suggestions:
              'Mention any performance optimizations for the filtering process.',
            score: 3,
          },
          {
            content:
              'Routed each card to a unique Server-side Rendered page with information on the specific Pokémon.',
            feedback: 'Good use of SSR, but could elaborate on benefits.',
            number: 4,
            rewrites: [
              'Leveraged Next.js SSR for individual Pokémon pages, ensuring optimal loading speeds and SEO performance.',
              'Implemented dynamic routing with Next.js SSR, creating unique, fast-loading pages for each Pokémon.',
            ],
            suggestions:
              'Mention any SEO benefits or performance improvements from using SSR.',
            score: 4,
          },
          {
            content:
              'Delivered an instant loading state from the server while the content of a route segment loads.',
            feedback: 'Good focus on user experience, but could be clearer.',
            number: 5,
            rewrites: [
              'Enhanced UX with server-side loading states, providing instant feedback during route transitions.',
              'Implemented server-side loading states to improve perceived performance and user engagement during navigation.',
            ],
            suggestions:
              'Quantify the improvement in user experience or page load times.',
            score: 4,
          },
        ],
      },
      {
        title: 'Bank Failure Warehouse',
        feedback: 'Solid project demonstrating data engineering skills.',
        score: 4,
        bullets: [
          {
            content:
              'Constructed a Data Warehouse via an ETL Pipeline plus Star Schema for Data Analysts to use.',
            feedback: 'Good overview, but could use more specific details.',
            number: 1,
            rewrites: [
              'Engineered ETL pipeline and Star Schema data warehouse, optimizing for analytical queries and data integrity.',
              'Designed and implemented comprehensive data warehouse with ETL processes, facilitating efficient data analysis.',
            ],
            suggestions:
              'Mention the scale of data handled or any specific optimizations in the schema design.',
            score: 4,
          },
          {
            content:
              'Extracted data from 1,178 companies in Python via Web Scraping and the Yahoo Finance API.',
            feedback: 'Good mention of data sources and scale.',
            number: 2,
            rewrites: [
              'Developed Python scraper and API integration to extract financial data from 1,178 companies via web and Yahoo Finance.',
              'Automated data collection for 1,178 companies using Python, combining web scraping and Yahoo Finance API integration.',
            ],
            suggestions:
              'Mention any challenges overcome in data extraction or rate limiting.',
            score: 4,
          },
          {
            content:
              'Transformed the extracted raw data into processed data via transposing and cleaning with Pandas.',
            feedback:
              'Clear mention of data processing, but could be more specific.',
            number: 3,
            rewrites: [
              'Engineered data transformation pipeline using Pandas, handling complex transposing and cleaning operations for accuracy.',
              'Optimized raw financial data using Pandas, implementing custom cleaning algorithms and data structure transformations.',
            ],
            suggestions:
              'Mention any specific cleaning operations or data quality improvements.',
            score: 3,
          },
          {
            content:
              'Loaded the processed data into Amazon S3 and built the Data Warehouse in Amazon Redshift.',
            feedback:
              'Good use of cloud technologies, but could elaborate on implementation.',
            number: 4,
            rewrites: [
              'Architected cloud-based data solution, utilizing Amazon S3 for storage and Redshift for high-performance data warehousing.',
              'Implemented scalable data pipeline, leveraging Amazon S3 for data lake and Redshift for optimized analytical queries.',
            ],
            suggestions:
              'Mention any specific Redshift optimizations or S3 data organization strategies.',
            score: 4,
          },
        ],
      },
    ],
  };

  return json({
    experiences,
    projects,
  });
}

const RESUME_MAX_FILE_SIZE = MB_IN_BYTES * 1;

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler({ maxPartSize: RESUME_MAX_FILE_SIZE }),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const { experiences, projects } = await reviewResume(
    form.get('resume') as unknown as File
  );

  return json({
    experiences,
    projects,
  });
}

export default function ReviewResume() {
  const { experiences, projects } = useLoaderData<typeof loader>();
  // const { experiences, projects } = useActionData<typeof action>() || {};

  return (
    <Modal onCloseTo={Route['/resume-books/:id']}>
      <Modal.Header>
        <Modal.Title>Review Resume</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Currently, the resume review tool will only give feedback on your bullet
        points for experiences and projects. This does not serve as a complete
        resume review, so you should still seek feedback from peers.
        Additionally, this tool relies on AI and may not always provide the best
        feedback, so take it with a grain of salt.
      </Modal.Description>

      <RemixForm
        className="form"
        data-gap="2rem"
        method="post"
        encType="multipart/form-data"
      >
        <Form.Field
          description="Please upload your resume."
          error=""
          label="Resume"
          labelFor="resume"
          required
        >
          <FileUploader
            accept={['application/pdf']}
            id="resume"
            maxFileSize={RESUME_MAX_FILE_SIZE}
            name="resume"
            required
          />
        </Form.Field>

        {(experiences || projects) && <Divider />}

        {!!experiences?.length && (
          <section>
            <Text className="mb-2" variant="xl">
              Experiences ({experiences.length})
            </Text>

            <ul className="flex flex-col gap-12">
              {experiences.map((experience, i) => {
                return (
                  <li key={i}>
                    <header className="mb-4">
                      <Text variant="lg">
                        {experience.role}, {experience.company}
                      </Text>
                      <Text color="gray-500">{experience.date}</Text>
                    </header>

                    <ul className="flex flex-col gap-8">
                      {experience.bullets.map((bullet) => {
                        return (
                          <BulletPoint
                            key={i + bullet.number}
                            content={bullet.content}
                            feedback={bullet.feedback}
                            rewrites={bullet.rewrites}
                            score={bullet.score}
                            suggestions={bullet.suggestions}
                          />
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!!projects?.length && (
          <section>
            <Text className="mb-2" variant="xl">
              Projects ({projects.length})
            </Text>

            <ul className="flex flex-col gap-12">
              {projects.map((project, i) => {
                return (
                  <li key={i}>
                    <header className="mb-4">
                      <Text variant="lg">{project.title}</Text>
                    </header>

                    <ul className="flex flex-col gap-8">
                      {project.bullets.map((bullet) => {
                        return (
                          <BulletPoint
                            key={i + bullet.number}
                            content={bullet.content}
                            feedback={bullet.feedback}
                            rewrites={bullet.rewrites}
                            score={bullet.score}
                            suggestions={bullet.suggestions}
                          />
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* <Text className="whitespace-pre-wrap">{message}</Text> */}

        {/* <Form.ErrorMessage>{error}</Form.ErrorMessage> */}

        <Button.Group>
          <Button.Submit>Submit</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}

type BulletPointProps = {
  content: string;
  feedback: string;
  rewrites: string[];
  score: number;
  suggestions: string;
};

function BulletPoint({
  content,
  feedback,
  rewrites,
  score,
  suggestions,
}: BulletPointProps) {
  return (
    <li className="ml-2 flex flex-col gap-4 border-l border-l-gray-200 pl-4">
      <div className="flex items-start justify-between gap-4">
        <Text className="italic" color="gray-500">
          {content}
        </Text>

        <span
          className={cx(
            'rounded px-1.5',

            match(score as 1 | 2 | 3 | 4 | 5)
              .with(1, () => 'bg-red-100 text-red-700')
              .with(2, () => 'bg-red-100 text-red-700')
              .with(3, () => 'bg-yellow-100 text-yellow-700')
              .with(4, () => 'bg-cyan-100 text-cyan-700')
              .with(5, () => 'bg-lime-100 text-lime-700')
              .run()
          )}
        >
          {score}
        </span>
      </div>

      <Text>
        {feedback} {suggestions}
      </Text>

      <ul className="flex flex-col gap-2">
        {rewrites.map((rewrite) => {
          return (
            <li
              className="rounded-lg border border-gray-100 bg-gray-50 p-2"
              key={rewrite}
            >
              <Text>Suggestion: {rewrite}</Text>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
