import {APIGatewayEvent, Context} from 'aws-lambda';
import * as crypto from 'crypto';
import {LogSwitchImpl} from './type/LogSwitch.impl';
import {TwitterClientImpl} from './type/twitter/TwitterClient.impl';
import {TwitterConfigImpl} from './type/config/ScrubjayConfig.impl';

const SLACK_SIGNING_KEY = process.env['SLACK_SIGNING_KEY'] || '';

interface Response {
    body: string;
    statusCode: number;
}

function slackEscape(orig: string): string {
    return orig
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        ;
}

function respond(msg: any): Response {
    const body = slackEscape(typeof msg === 'string' ? msg : '```\n' + JSON.stringify(msg, null, '\t') + '\n```');
    return {
        statusCode: 200,
        body
    };
}

export const handler = async function (
    event: APIGatewayEvent,
    context: Context,
): Promise<Response> {
    try {
        if (event == null ||
            event.headers == null ||
            event.headers['X-Slack-Signature'] == null ||
            event.headers['X-Slack-Request-Timestamp'] == null ||
            SLACK_SIGNING_KEY === '') {
            return respond('Slack integration looks busted — could not get X-Slack-Signature');
        }
        const givenSlackSignature = event.headers['X-Slack-Signature'];
        const givenSlackRequestTimestamp = event.headers['X-Slack-Request-Timestamp'];
        const [givenSlackSignatureVersion, givenSlackSignatureValue] = givenSlackSignature.split('=');
        if (event.body == null) {
            return respond('Slack integration looks busted — could not get the request body');
        }
        if (event.headers['Content-Type'] !== 'application/x-www-form-urlencoded') {
            return respond('Slack integration looks busted — expected application/x-www-form-urlencoded content type, got: ' +
                event.headers['Content-Type']);
        }
        const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body;
        const bodyParts: { [key: string]: string | string[]; } = {};
        for (const pair of body.split('&')) {
            const keyAndValue = pair.split('=');
            const key = decodeURIComponent(keyAndValue[0].replace(/\+/g, ' '));
            const value = decodeURIComponent(keyAndValue[1].replace(/\+/g, ' '));
            if (Array.isArray(bodyParts[key])) {
                (bodyParts[key] as string[]).push(value);
            } else if (typeof bodyParts[key] === 'string') {
                bodyParts[key] = [bodyParts[key] as string, value];
            } else {
                bodyParts[key] = value;
            }
        }
        const nowSeconds = new Date().getTime() / 1000;
        const deltaSeconds = Math.abs(nowSeconds - Number(givenSlackRequestTimestamp));
        if (deltaSeconds > 10) {
            return respond('Slack integration looks busted — delta seconds: ' + deltaSeconds);
        }
        const slackSignatureNonce = `${givenSlackSignatureVersion}:${givenSlackRequestTimestamp}:${body}`;
        const hmac = crypto.createHmac('sha256', SLACK_SIGNING_KEY);
        hmac.update(slackSignatureNonce);
        const slackSignatureGenerated = hmac.digest().toString('hex').toLowerCase();
        if (slackSignatureGenerated !== givenSlackSignatureValue.toLowerCase()) {
            return respond('Slack integration looks busted — got an invalid signature');
        }
        if (bodyParts['command'] !== '/twit') {
            return respond('Unexpected command: ' + JSON.stringify(bodyParts['command']));
        }
        if (Array.isArray(bodyParts['text'])) {
            return respond('Slack integration looks busted — text was an array');
        }
        const commandText = unescape((bodyParts['text'] as string) || '');
        const commandParts = commandText.split(/\s+/g);
        if (commandText === '' || commandText === 'help' || (commandParts.length > 0 && commandParts[0] === 'help')) {
            return respond('Usage:\n`/twit json twitName`\n`/twit echo`');
        }
        switch (commandParts[0]) {
            case 'json':
                const twitName = commandParts[1];
                if (commandParts.length !== 2 || twitName == null || !twitName.match(/^[-a-z0-9_]+$/i)) {
                    return respond('Usage: `/twit json twitName` (don\'t include the `@`)\nCommand: `' +
                        JSON.stringify(commandParts) + '`\nTwit: `' + twitName + '`');
                }
                // const dynamo = new DynamoDB({
                //     region: AWS_REGION
                // });
                // const existingTwit = await dynamo.getItem({
                //     AttributesToGet: ['id'],
                //     TableName: 'twit',
                //     Key: {
                //         name: {
                //             S: twitName
                //         }
                //     }
                // }).promise();
                // if (existingTwit.Item != null) {
                //     return respond('That twit is already followed: `' + twitName + '`');
                // }
                const twitterClient = new TwitterClientImpl(
                    TwitterConfigImpl.fromObject({
                        accessTokenKey: process.env['TWITTER_ACCESS_TOKEN_KEY'] || '',
                        accessTokenSecret: process.env['TWITTER_ACCESS_TOKEN_SECRET'] || '',
                        consumerKey: process.env['TWITTER_CONSUMER_KEY'] || '',
                        consumerSecret: process.env['TWITTER_CONSUMER_SECRET'] || ''
                    }),
                    undefined as any,
                    undefined as any,
                    undefined as any,
                    new LogSwitchImpl(),
                );
                const twit = await twitterClient.fetchUser(twitName);
                if (twit == null) {
                    return respond('Could not find that twit: `' + twitName + '`');
                }
                return respond(twit);
            case 'echo':
                return respond(bodyParts);
            case 'unpublish':
                return respond('Not implemented');
            default:
                return respond('Sorry, I don\'t know that command:\n```\n' + commandText + '\n```');
        }
    } catch (e) {
        return respond('Slack integration looks busted — got an error:\n```\n' + JSON.stringify(e, null, '\t') + '\n```');
    }
};
