import { match } from 'ts-pattern';
import { z } from 'zod';

import { db } from '@oyster/db';
import {
  FORMATTED_DEMOGRAPHICS,
  FORMATTED_GENDER,
  FORMATTED_RACE,
  Student,
} from '@oyster/types';

import {
  AirtableBullJob,
  type GetBullJobData,
} from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { IS_PRODUCTION } from '@/shared/env';
import { ColorStackError, ErrorWithContext } from '@/shared/errors';
import { RateLimiter } from '@/shared/utils/rate-limiter';

// Environment Variables

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

export const AIRTABLE_FAMILY_BASE_ID = process.env.AIRTABLE_FAMILY_BASE_ID;
export const AIRTABLE_MEMBERS_TABLE_ID = process.env.AIRTABLE_MEMBERS_TABLE_ID;

// Constants

const AIRTABLE_API_URI = 'https://api.airtable.com/v0';

// Rate Limiter

/**
 * @see https://airtable.com/developers/web/api/rate-limits
 */
const airtableRateLimiter = new RateLimiter('airtable:connections', {
  rateLimit: 5,
  rateLimitWindow: 1,
});

// Shared

function getAirtableHeaders(
  options: { includeContentType: boolean } = { includeContentType: false }
) {
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    ...(options.includeContentType && {
      'Content-Type': 'application/json',
    }),
  };
}

// Bull Worker

export const airtableWorker = registerWorker(
  'airtable',
  AirtableBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'airtable.record.create' }, ({ data }) => {
        return createAirtableRecord(data);
      })
      .with({ name: 'airtable.record.create.member' }, ({ data }) => {
        return createAirtableMemberRecord(data);
      })
      .with({ name: 'airtable.record.delete' }, ({ data }) => {
        return deleteAirtableRecord(data);
      })
      .with({ name: 'airtable.record.update' }, ({ data }) => {
        return updateAirtableRecord(data);
      })
      .with({ name: 'airtable.record.update.bulk' }, ({ data }) => {
        return bulkUpdateAirtableRecord(data);
      })
      .exhaustive();
  }
);

// Core

const AirtableMemberRecord = Student.pick({
  email: true,
  firstName: true,
  gender: true,
  id: true,
  lastName: true,
  linkedInUrl: true,
  graduationYear: true,
  otherDemographics: true,
  race: true,
}).extend({
  school: z.string().optional(),
});

type AirtableMemberRecord = z.infer<typeof AirtableMemberRecord>;

async function createAirtableMemberRecord({
  studentId,
}: GetBullJobData<'airtable.record.create.member'>) {
  if (
    !IS_PRODUCTION ||
    !AIRTABLE_FAMILY_BASE_ID ||
    !AIRTABLE_MEMBERS_TABLE_ID
  ) {
    return;
  }

  const member = await db
    .selectFrom('students')
    .leftJoin('schools', 'schools.id', 'students.schoolId')
    .select([
      'email',
      'firstName',
      'gender',
      'lastName',
      'linkedInUrl',
      'graduationYear',
      'otherDemographics',
      'race',
      'students.id',
      (eb) => {
        return eb.fn
          .coalesce('schools.name', 'students.otherSchool')
          .as('school');
      },
    ])
    .where('students.id', '=', studentId)
    .executeTakeFirstOrThrow();

  const record = AirtableMemberRecord.parse(member);

  const id = await createAirtableRecord({
    airtableBaseId: AIRTABLE_FAMILY_BASE_ID,
    airtableTableId: AIRTABLE_MEMBERS_TABLE_ID,
    data: {
      'ColorStack ID': studentId,
      Email: record.email,
      'Expected Graduation Year': record.graduationYear.toString(),
      'First Name': record.firstName,
      'Last Name': record.lastName,
      'LinkedIn Profile/URL': record.linkedInUrl,
      'Race & Ethnicity': record.race.map((race) => FORMATTED_RACE[race]),
      Gender: FORMATTED_GENDER[record.gender],
      'Member Type': 'Full Member',
      'Quality of Life': record.otherDemographics.map((demographic) => {
        return FORMATTED_DEMOGRAPHICS[demographic];
      }),
      School: record.school,
    },
  });

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('students')
      .set({ airtableId: id })
      .where('id', '=', studentId)
      .execute();
  });
}

/**
 * @see https://airtable.com/developers/web/api/create-records
 */
export async function createAirtableRecord({
  airtableBaseId,
  airtableTableId,
  data,
}: GetBullJobData<'airtable.record.create'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  await airtableRateLimiter.process();

  const response = await fetch(
    `${AIRTABLE_API_URI}/${airtableBaseId}/${airtableTableId}`,
    {
      body: JSON.stringify({
        fields: data,

        // This means that if there is a select field (whether single or multi),
        // if the value we send to Airtable is not already there, it should
        // create that value instead of failing.
        typecast: true,
      }),
      headers: getAirtableHeaders({ includeContentType: true }),
      method: 'post',
    }
  );

  if (!response.ok) {
    throw new ErrorWithContext('Failed to create Airtable record.').withContext(
      data
    );
  }

  console.log({
    code: 'airtable_record_created',
    message: 'Airtable record was created.',
  });

  const json = await response.json();

  return json.id as string;
}

type AirtableColor =
  | 'blueBright'
  | 'blueDark1'
  | 'blueLight1'
  | 'blueLight2'
  | 'cyanBright'
  | 'cyanDark1'
  | 'cyanLight1'
  | 'cyanLight2'
  | 'grayBright'
  | 'grayDark1'
  | 'grayLight1'
  | 'grayLight2'
  | 'greenBright'
  | 'greenDark1'
  | 'greenLight1'
  | 'greenLight2'
  | 'orangeBright'
  | 'orangeDark1'
  | 'orangeLight1'
  | 'orangeLight2'
  | 'pinkBright'
  | 'pinkDark1'
  | 'pinkLight1'
  | 'pinkLight2'
  | 'purpleBright'
  | 'purpleDark1'
  | 'purpleLight1'
  | 'purpleLight2'
  | 'redBright'
  | 'redDark1'
  | 'redLight1'
  | 'redLight2'
  | 'tealBright'
  | 'tealDark1'
  | 'tealLight1'
  | 'tealLight2'
  | 'yellowBright'
  | 'yellowDark1'
  | 'yellowLight1'
  | 'yellowLight2';

const SORTED_AIRTABLE_COLORS: AirtableColor[] = [
  'blueLight2',
  'cyanLight2',
  'tealLight2',
  'greenLight2',
  'yellowLight2',
  'orangeLight2',
  'redLight2',
  'pinkLight2',
  'purpleLight2',
  'grayLight2',
  'blueLight1',
  'cyanLight1',
  'tealLight1',
  'greenLight1',
  'yellowLight1',
  'orangeLight1',
  'redLight1',
  'pinkLight1',
  'purpleLight1',
  'grayLight1',
  'blueBright',
  'cyanBright',
  'tealBright',
  'greenBright',
  'yellowBright',
  'orangeBright',
  'redBright',
  'pinkBright',
  'purpleBright',
  'grayBright',
  'blueDark1',
  'cyanDark1',
  'tealDark1',
  'greenDark1',
  'yellowDark1',
  'orangeDark1',
  'redDark1',
  'pinkDark1',
  'purpleDark1',
  'grayDark1',
];

type AirtableFieldOptions = {
  choices: {
    color?: AirtableColor;
    name: string;
  }[];
};

export type AirtableField = { name: string } & (
  | { type: 'email' }
  | { type: 'multipleAttachments' }
  | { type: 'multipleSelects'; options: AirtableFieldOptions }
  | { type: 'singleLineText' }
  | { type: 'singleSelect'; options: AirtableFieldOptions }
  | { type: 'url' }
);

type CreateAirtableTableInput = {
  baseId: string;
  fields: AirtableField[];
  name: string;
};

export async function createAirtableTable({
  baseId,
  fields,
  name,
}: CreateAirtableTableInput) {
  await airtableRateLimiter.process();

  // The Airtable API doesn't automatically assign colors to select fields, that
  // only happens when you use the Airtable UI. So we need to manually assign
  // colors if we don't specify them.
  fields = fields.map((field) => {
    if (field.type === 'singleSelect' || field.type === 'multipleSelects') {
      return {
        ...field,
        options: {
          choices: field.options.choices.map((choice, i) => {
            return {
              ...choice,
              color:
                choice.color ||
                SORTED_AIRTABLE_COLORS[i % SORTED_AIRTABLE_COLORS.length],
            };
          }),
        },
      };
    }

    return field;
  });

  const response = await fetch(
    `${AIRTABLE_API_URI}/meta/bases/${baseId}/tables`,
    {
      body: JSON.stringify({ name, fields }),
      method: 'post',
      headers: getAirtableHeaders({ includeContentType: true }),
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to create Airtable table.')
      .withContext({
        baseId,
        fields,
        name,
        response: json,
      });
  }

  return json.id as string;
}

/**
 * @see https://airtable.com/developers/web/api/delete-record
 */
async function deleteAirtableRecord({
  airtableBaseId,
  airtableRecordId,
  airtableTableId,
}: GetBullJobData<'airtable.record.delete'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  await airtableRateLimiter.process();

  await fetch(
    `${AIRTABLE_API_URI}/${airtableBaseId}/${airtableTableId}/${airtableRecordId}`,
    {
      headers: getAirtableHeaders(),
      method: 'delete',
    }
  );

  console.log({
    code: 'airtable_record_deleted',
    message: 'Airtable record was deleted.',
    data: {
      airtableBaseId,
      airtableRecordId,
      airtableTableId,
    },
  });
}

/**
 * @see https://airtable.com/developers/web/api/update-record
 */
export async function updateAirtableRecord({
  airtableBaseId,
  airtableRecordId,
  airtableTableId,
  data,
}: GetBullJobData<'airtable.record.update'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  await airtableRateLimiter.process();

  const response = await fetch(
    `${AIRTABLE_API_URI}/${airtableBaseId}/${airtableTableId}/${airtableRecordId}`,
    {
      body: JSON.stringify({
        fields: data,
        typecast: true,
      }),
      headers: getAirtableHeaders({ includeContentType: true }),
      method: 'PATCH',
    }
  );

  console.log({
    code: 'airtable_record_updated',
    message: 'Airtable record was updated.',
    data: {
      airtableBaseId,
      airtableRecordId,
      airtableTableId,
      data,
    },
  });

  const json = await response.json();

  return json.id as string;
}

/**
 * @see https://airtable.com/developers/web/api/update-multiple-records
 */
export async function bulkUpdateAirtableRecord({
  airtableBaseId,
  airtableTableId,
  records,
}: GetBullJobData<'airtable.record.update.bulk'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  await airtableRateLimiter.process();

  const body = JSON.stringify({
    records: records.map((record) => {
      return {
        id: record.id,
        fields: record.data,
      };
    }),

    typecast: true,
  });

  const response = await fetch(
    `${AIRTABLE_API_URI}/${airtableBaseId}/${airtableTableId}`,
    {
      body,
      headers: getAirtableHeaders({ includeContentType: true }),
      method: 'PATCH',
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to bulk update records in Airtable.')
      .withContext({ json, records, status: response.status })
      .report();
  }

  console.log({
    code: 'airtable_record_bulk_updated',
    message: 'Airtable records were bulk updated.',
    data: {
      airtableBaseId,
      airtableTableId,
    },
  });
}
