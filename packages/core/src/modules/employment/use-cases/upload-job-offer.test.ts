import { db } from '@/infrastructure/database';
import { id } from '@oyster/utils';
import { EmploymentType, LocationType } from '../employment.types';
import { uploadJobOffer } from './upload-job-offer';

describe(uploadJobOffer.name, () => {
  let realCompanyId: string;
  let realStudentId: string;

  beforeAll(async () => {
    const company = await db
      .selectFrom('companies')
      .select('id')
      .limit(1)
      .executeTakeFirst();

    if (company) {
      realCompanyId = company.id;
    } else {
      console.log('No company found');
    }

    const student = await db
      .selectFrom('students')
      .select('id')
      .limit(1)
      .executeTakeFirst();

    if (student) {
      realStudentId = student.id;
    } else {
      console.log('No student found');
    }
  });
  test('Successfully uploads a job offer', async () => {
    const testJobOfferInput = {
      companyId: realCompanyId,
      studentId: realStudentId,
      baseSalary: 100000,
      bonus: 5000,
      compensationType: 'Salary',
      employmentType: EmploymentType.FULL_TIME,
      hourlyPay: 0,
      otherCompany: null,
      startDate: new Date().toISOString(),
      status: 'Accepted',
      stockPerYear: 0,
      location: 'New York, NY',
      locationCoordinates: '40.7128,-74.0060',
      locationType: LocationType.HYBRID,
    };

    const jobOfferId = await db.transaction().execute(async (trx) => {
      return uploadJobOffer(testJobOfferInput);
    });

    const insertedJobOffer = await db
      .selectFrom('job_offers')
      .selectAll()
      .where('id', '=', id())
      .executeTakeFirst();

    expect(insertedJobOffer).toBeTruthy();
    expect(insertedJobOffer?.companyId).toBe(testJobOfferInput.companyId);
  });
});
