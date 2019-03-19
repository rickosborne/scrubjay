'use strict';

import env from './lib/env';
import './type/services';

env.debug(() => `scrubjay`);
import {migrator} from './lib/schema';
import {TwitterClient} from './type/twitter/TwitterClient';
import {TweetStore} from './type/twitter/store/TweetStore';
import {FeedStore} from './type/slack/FeedStore';
import {TwitterUser} from './type/twitter/TwitterUser';
import {SlackBot} from './type/slack/SlackBot';
import {TwitterUserStore} from './type/twitter/store/TwitterUserStore';
// import * as wtfnode from 'wtfnode';

migrator.onReady(() => {
  const tweetStore = TweetStore.getInstance();
  const slackBot = SlackBot.getInstance();
  const twitterClient = TwitterClient.getInstance();
  const twitterUserStore = TwitterUserStore.getInstance();
  const feedStore = FeedStore.getInstance();

  tweetStore.follows().then(users => {
    twitterClient.addUsers(...users);
    twitterClient.onTweet(tweet => {
      const waitFor: Promise<TwitterUser | null> = tweet.replyUser == null ? Promise.resolve(null)
        : twitterUserStore.findOneByName(tweet.replyUser);
      waitFor.then(replyUser => {
        if (tweet.replyUser != null && replyUser == null) {
          env.debug(() => `We don't follow ${tweet.replyUser}`);
          return;  // reply to someone we don't follow
        }
        feedStore
          .channelsFor(tweet.user)
          .then(channels => {
            const messages = slackBot.messagesFromTweet(tweet);
            env.debug(() => `#${channels.map(c => c.name).join('|#')} ${JSON.stringify(messages)}`);
            for (const message of messages) {
              for (const channel of channels) {
                slackBot
                  .send(message.with(channel.id))
                  .catch(reason => env.debug(`Could not forward tweet: ${JSON.stringify(reason)}`));
              }
            }
          });
      });
    });
    twitterClient.connect();
  });
// wtfnode.dump();
})
;
