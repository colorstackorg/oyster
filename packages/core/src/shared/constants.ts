import dayjs from 'dayjs';

export const ACTIVATION_FLOW_LAUNCH_DATE = dayjs()
  .year(2023)
  .month(5)
  .date(9)
  .startOf('day')
  .toDate();
