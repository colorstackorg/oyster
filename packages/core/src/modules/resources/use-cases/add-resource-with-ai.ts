import { z } from 'zod';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { getChatCompletion } from '@/infrastructure/ai';
import { job } from '@/infrastructure/bull';
import { getPageContent } from '@/infrastructure/puppeteer';
import { fail, type Result, success } from '@/shared/utils/core';

const REFINE_RESOURCE_SYSTEM_PROMPT = `
  You are a helpful assistant that extracts structured data from a website's
  text content. Your goal is to analyze the text content and extract key
  information to create a useful resource entry.`;

const REFINE_RESOURCE_PROMPT = `
  Your job is to analyze the given webpage and extract the following information
  and format it as JSON:

  1. "title": The title of the resource, max 75 characters.
  2. "description": A brief description of the resource, max 150 characters.
     Extract the most relevant information including what the resource is, who is
     it for, key features, benefits, and any other relevant details
     to someone open to using the resource.
  3. "tags": A list of tags that fit this resource, maximum 5 tags and
     minimum 1 tag. This is the MOST IMPORTANT FIELD. We have a list of existing
     tags in our database that are available to associate with this opportunity.
     If there are no relevant tags, DO NOT create new tags and instead return
     null for this field. Some rules for tags:
      - Only apply the Interview Prep tag if the resource is specifically
      designed to help users prepare for interviews (e.g., mock questions, tips,
      interview guides).
      - Use the Academic tag only for resources that are educational in nature
      (e.g., textbooks, research papers, course material).
      - Use the Career Advice tag for resources offering professional
      development, job search strategies, or career exploration.
      - Use the Learning tag for resources that teach general skills or
      knowledge, outside of direct academic coursework (e.g., online courses,
      tutorials, skill-building guides).
      - Use the Video tag if the resource is a video format (e.g., YouTube
      lectures, recorded webinars).
      - If a resource fits multiple categories, prioritize the most central
      purpose of the resource when selecting tags.


  Here's the webpage you need to analyze:

  <website_content>
    $WEBSITE_CONTENT
  </website_content>

  Here are the existing tags in our database that you can choose from:

  <tags>
    $TAGS
  </tags>

  Follow these guidelines:
  - If you cannot confidently infer a field, set it to null.
  - If the page is not found or otherwise not a valid resource, set all fields
    to null.
  - Double check that your output is based on the website content. Don't make
    up information that you cannot confidently infer from the website content.

  Your output should be a single JSON object containing these fields. Do not
  provide any explanation or text outside of the JSON object. Ensure your JSON
  is properly formatted and valid.

  <output>
    {
      "description": "string | null",
      "tags": "string[] | null",
      "title": "string | null"
    }
  </output>
`;

const RefineResourceResponse = z.object({
  title: z.string().trim().min(1).max(100).nullable(),
  description: z.string().trim().min(1).max(175).nullable(),
  tags: z.array(z.string().trim().min(1)).min(1).max(5).nullable(),
});

type RefineResourceResponse = z.infer<typeof RefineResourceResponse>;

type RefineResourceInput = {
  content: string;
};

/**
 * Refines a resource by extracting structured data from the given webpage content.
 * Uses AI to extract title, description, and tags from the content.
 */
async function refineResource(
  input: RefineResourceInput
): Promise<Result<RefineResourceResponse>> {
  const prompt = REFINE_RESOURCE_PROMPT
    //
    .replace('$WEBSITE_CONTENT', input.content);

  const completionResult = await getChatCompletion({
    maxTokens: 500,
    messages: [{ role: 'user', content: prompt }],
    system: [{ type: 'text', text: REFINE_RESOURCE_SYSTEM_PROMPT }],
    temperature: 0,
  });

  if (!completionResult.ok) {
    return completionResult;
  }

  let json: JSON;

  try {
    json = JSON.parse(completionResult.data);
  } catch (e) {
    console.debug(
      'Failed to parse JSON from AI response.',
      completionResult.data
    );

    return fail({
      code: 400,
      error: 'Failed to parse JSON from AI response.',
    });
  }

  let data: RefineResourceResponse;

  try {
    data = RefineResourceResponse.parse(json);
  } catch (error) {
    console.error(error);

    return fail({
      code: 400,
      error: 'Failed to validate JSON from AI response.',
    });
  }

  return success(data);
}

type AddResourceWithAIInput = {
  link: string;
  postedBy: string;
  type: string;
};

type AddResourceWithAIResult = Result<
  { id: string },
  { duplicateResourceId: string }
>;

export async function addResourceWithAI(
  input: AddResourceWithAIInput
): Promise<AddResourceWithAIResult> {
  const existingResource = await db
    .selectFrom('resources')
    .select('id')
    .where('link', '=', input.link)
    .executeTakeFirst();

  if (existingResource) {
    return fail({
      code: 409,
      context: { duplicateResourceId: existingResource.id },
      error: 'A resource with this link has already been added.',
    });
  }

  const result = await db.transaction().execute(async (trx) => {
    const resourceId = id();

    const resource = await trx
      .insertInto('resources')
      .values({
        id: resourceId,
        link: input.link,
        postedBy: input.postedBy,
        type: input.type,
        title: 'Loading...',
        description: 'Loading...',
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    const isProtectedURL =
      input.link?.includes('docs.google.com') ||
      input.link?.includes('linkedin.com');

    if (!isProtectedURL) {
      const websiteContent = await getPageContent(input.link);

      const refinedResult = await refineResource({
        content: websiteContent,
      });

      if (refinedResult.ok) {
        await trx
          .updateTable('resources')
          .set({
            title: refinedResult.data.title || 'Untitled Resource',
            description:
              refinedResult.data.description || 'No description available',
          })
          .where('id', '=', resource.id)
          .execute();

        if (refinedResult.data.tags?.length) {
          for (const tagName of refinedResult.data.tags) {
            const tag = await trx
              .selectFrom('tags')
              .select('id')
              .where('name', '=', tagName)
              .executeTakeFirst();

            if (tag) {
              await trx
                .insertInto('resourceTags')
                .values({
                  resourceId: resource.id,
                  tagId: tag.id,
                })
                .execute();
            }
          }
        }
      }
    }

    return resource;
  });

  job('gamification.activity.completed', {
    resourceId: result.id,
    studentId: input.postedBy,
    type: 'post_resource',
  });

  return success(result);
}
