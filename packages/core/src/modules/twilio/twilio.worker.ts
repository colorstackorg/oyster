import {match} from 'ts-pattern';

import{TwilioMessagingBullJob} from '@/infrastructure/bull.types'
import { registerWorker } from '@/infrastructure/bull';
import { sendMessages } from './twilio.service';

export const twilioWorker = registerWorker(
    'twilio', 
    TwilioMessagingBullJob,
    async(job) =>{
        return match(job)
          .with({name:'twilio.messaging'},({data}) => {
            console.log("yello manny")
            return sendMessages(data)
          })
          .exhaustive()
    }
)