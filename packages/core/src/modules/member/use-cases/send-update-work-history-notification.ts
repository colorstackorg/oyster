import { job } from '@/infrastructure/bull/use-cases/job';
import dedent from 'dedent';

export async function sendUpdateWorkHistoryProfileNotification(userId: string, text:string) {

    if (!userId || !text) {
        console.error('Mising userId or text');
        return; 
    }
    const keywords = ['offer', 'join', 'signed', 'accepted', 'joining', 'signing', 'selected', 'with']
    if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        const message = dedent `
            Congratulations on securing the bag!  🎉

            We noticed your post in the #career-secured-the-bag channel.
            Don't forget to update your <https://app.colorstack.io/profile/work|*Work History*> on your member profile.
            Keep up the great work!
        `;

        job('notification.slack.send', {
            channel: userId,
            message: message,
            workspace: 'regular'
        })
    }

}