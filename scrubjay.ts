'use strict';

import env from './lib/env';

env.debug(() => `scrubjay`);
import {migrator} from './lib/schema';
import {twitterClient} from './type/twitter/TwitterClient';
import {tweetStore} from './type/twitter/TweetStore';
import {slackClient} from './type/slack/SlackClient';
import {FeedChannel, slackFeedStore} from './type/slack/FeedStore';
import {twitterUserStore} from './type/twitter/TwitterUser';
import {twitterEventStore} from './type/twitter/TwitterEventStore';
import {slackTweetFormatter} from './type/slack/SlackTweetFormatter';
// import * as wtfnode from 'wtfnode';

migrator.onReady(() => {
  tweetStore.follows()
    .then(users => {
      twitterClient.addUsers(...users);
      twitterClient.onTweet(tweet => slackFeedStore
        .channelsFor(tweet.user).then(channels => {
          const blocks = slackTweetFormatter.blockify(tweet);
          env.debug(() => `#${channels.join('|#')} ${JSON.stringify(blocks)}`);
          for (const channel of channels) {
            slackClient
              .send(blocks, channel.id)
              .catch(reason => env.debug(`Could not forward tweet: ${JSON.stringify(reason)}`));
          }
        })
      );
      twitterClient.connect();
    });
  slackClient
    .command('ping', 'See if I\'m online.', command => command.reply('pong'))
    .command('channels', 'What channels am I aware of?', command => command
      .reply((message, actions) => {
        actions.typing();
        return slackFeedStore.channels.then(channels => {
          if (channels == null || channels.length === 0) {
            return `I am not in any channels at the moment.`;
          }
          const links: string[] = ['I am available in:'];
          for (const channel of channels) {
            links.push(channel.link);
          }
          return links.join(' ');
        });
      })
    )
    .command('channel', null, command => command
      .param('name', 'Show information about a channel.', param => param
        .subcommand('create', 'Create a feed for a channel.', subcommand => subcommand
          .reply((message, actions, channelName) => {
            return actions.typing().channel(channelName)
              .then(channel => {
                if (channel == null) {
                  return `That's not a channel or I don't have access to it.`;
                }
                return slackFeedStore.createFeed(channel).then(feed => `I will publish a feed to ${feed.link}`);
              })
              .catch(reason => {
                env.debug(`Could not resolve channel ${channelName}: ${JSON.stringify(reason)}`);
                return `Could not resolve channel ${channelName}`;
              });
          })
        )
      )
      .subcommand('follow', null, subcommand => subcommand
        .param('username', 'Publish tweets from $username on channel $name', param => param
          .reply((message, actions, channelName, username) => Promise
            .all([
              actions.typing().channel(channelName),
              twitterUserStore.findOneByName(username)
            ])
            .then(([channel, user]) => slackFeedStore
              .follow(channel, user)
              .then(successful => {
                const link = FeedChannel.linkFor(channel);
                if (successful) {
                  return `I will publish a feed for ${user.name} to ${link}`;
                } else {
                  return `I was not able to create a link between ${user.name} and ${link}`;
                }
              })
            )
            .catch(reason => `Could not follow ${username} on ${channelName}: ${JSON.stringify(reason)}`)
          )
        )
      )
    )
    .command('follows', 'Show the twitterers I\'m following', command => command
      .reply(() => tweetStore.follows()
        .then(follows => {
          if (follows == null || follows.length === 0) {
            return `I'm not currently following anyone.`;
          }
          return `I'm following: ${follows.map(user => user.name).map(name => slackTweetFormatter.userLink(name)).join(' ')}`;
        })
      )
    )
    .command('latest tweet', 'Show the latest tweet I\'ve tracked', command => command
      .blockReply(() => twitterEventStore.latest.then(tweet => slackTweetFormatter.blockify(tweet)))
    )
    .command('latest', null, command => command
      .param('username', 'Show the latest tweet from $username', param => param
        .blockReply((message, actions, username) => twitterEventStore
          .latestFor(username).then(tweet => {
            if (tweet == null) {
              actions.reply(`I have not seen anything from @${username}`)
                .catch(reason => env.debug(`Could not reply: ${JSON.stringify(reason)}`));
              return null;
            }
            return slackTweetFormatter.blockify(tweet);
          })
        )
      )
    )
    .help('help')
    .otherwise(message => `I don't know what that means: ${message.text}`)
    .start()
    .then(() => env.debug(`Slack client online`));
// wtfnode.dump();
})
;
