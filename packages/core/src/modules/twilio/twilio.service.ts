import Twilio from 'twilio';

import { db } from '@oyster/db';

import {GetBullJobData} from '@/infrastructure/bull/bull.types'


const twilioNumber = 'INSERT HERE';
const accountSid = 'INSERT HERE'; 
const authToken = 'INSERT HERE'; 
const client = Twilio(accountSid, authToken);

export async function sendMessages(
    _: GetBullJobData<'twilio.messaging'>
) {
    try{
        const studentsPhoneNumbers = await db
            .selectFrom('students')
            .select(['phoneNumber'])
            .execute();

        console.log("Fetched phone numbers:", studentsPhoneNumbers); // Log the raw data from the database
        const numbers = studentsPhoneNumbers
            .map(({ phoneNumber }) => phoneNumber)
            .filter(Boolean); 

        const messagePromises = numbers.map(phoneNumber => 
            client.messages.create({
                body: 'Money Here', 
                to: `${phoneNumber}`,
                from: twilioNumber
            })
            .then(message => console.log(`Message sent to ${message.to}`))
            .catch(error => console.error(`Failed to send message to ${phoneNumber}:`, error))
        );

        Promise.all(messagePromises)
        .then(() => console.log('All messages processed'))
        .catch(err => console.error('Error in processing messages:', err));
        
    }catch (error) {
        console.error("Failed to send messages:", error);
    }
}

