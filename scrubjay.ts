'use strict';

import env from './lib/env';

env.debug(() => `scrubjay`);
import {migrator} from './lib/schema';
import {TwitterClient} from './type/twitter/TwitterClient';
import {TweetStore} from './type/twitter/TweetStore';
import {SlackClient} from './type/slack/SlackClient';
import {FeedStore} from './type/slack/FeedStore';
import {TwitterUser, TwitterUserStore} from './type/twitter/TwitterUser';
import {SlackTweetFormatter} from './type/slack/SlackTweetFormatter';
import {SlackBot} from './type/slack/SlackBot';
import {getConfig} from './type/Config';
import {TwitterEventStore} from './type/twitter/TwitterEventStore';
// import * as wtfnode from 'wtfnode';

migrator.onReady(() => {
  Promise.all([
    TweetStore.getInstance(),
    TwitterEventStore.getInstance(),
    TwitterUserStore.getInstance(),
    FeedStore.getInstance(),
  ])
    .then(([tweetStore, twitterEventStore, twitterUserStore, feedStore]) => {
      const config = getConfig();
      TwitterClient.getInstance(config.twitter, twitterEventStore, tweetStore).then(twitterClient =>
        SlackBot.getInstance(
          new SlackClient(config.slack), new SlackTweetFormatter(), feedStore,
          twitterUserStore, tweetStore, twitterEventStore, twitterClient, config
        ).then(slackBot => {
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
        })
          .catch(env.debugFailure('SlackBot/TwitterClient failure'))
      )
        .catch(env.debugFailure('Could not create TwitterClient'));
    })
    .catch(env.debugFailure('Could not start SlackBot'));
// wtfnode.dump();
})
;
