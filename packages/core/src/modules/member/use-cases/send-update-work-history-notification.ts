import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import dedent from 'dedent';

export async function sendUpdateWorkHistoryProfileNotification(userId: string, text:string) {

    if (!userId || !text) {
        console.error('Mising userId or text');
        return; 
    }
    if (text.toLowerCase().includes('offer')) {
        const message = dedent `
            Congratulations on securing the bag!  🎉

            We noticed your post in the #career-secured-the-bag channel.
            Don't forget to update your work history on your member profile
            Here's the link: https://app.colorstack.io/profile/work

            Keep up the great work!
        `;

        job('notification.slack.send', {
            channel: userId,
            message: message,
            workspace: 'regular'
        })
    }

}