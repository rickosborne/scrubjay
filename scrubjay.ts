'use strict';

import env from './lib/env';

env.debug(() => `scrubjay`);
import {migrator} from './lib/schema';
import {twitterClient} from './type/twitter/TwitterClient';
import {tweetStore} from './type/twitter/TweetStore';
import {PostableMessage, slackClient} from './type/slack/SlackClient';
import {FeedChannel, slackFeedStore} from './type/slack/FeedStore';
import {TwitterUser, twitterUserStore} from './type/twitter/TwitterUser';
import {twitterEventStore} from './type/twitter/TwitterEventStore';
import {slackTweetFormatter} from './type/slack/SlackTweetFormatter';
// import * as wtfnode from 'wtfnode';

migrator.onReady(() => {
  tweetStore.follows()
    .then(users => {
      twitterClient.addUsers(...users);
      twitterClient.onTweet(tweet => {
        const waitFor: Promise<TwitterUser | null> = tweet.replyUser == null ? Promise.resolve(null)
          : twitterUserStore.findOneByName(tweet.replyUser);
        waitFor.then(replyUser => {
          if (tweet.replyUser != null && replyUser == null) {
            env.debug(() => `We don't follow ${tweet.replyUser}`);
            return;  // reply to someone we don't follow
          }
          slackFeedStore
            .channelsFor(tweet.user)
            .then(channels => {
              const messages = slackTweetFormatter.messagesFromTweet(tweet);
              env.debug(() => `#${channels.map(c => c.name).join('|#')} ${JSON.stringify(messages)}`);
              for (const message of messages) {
                for (const channel of channels) {
                  slackClient
                    .send(message.with(channel.id))
                    .catch(reason => env.debug(`Could not forward tweet: ${JSON.stringify(reason)}`));
                }
              }
            });
        });
      });
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
      .param('name', null, channelParam => channelParam
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
        .subcommand('follows', 'Show follows published to a channel', subcommand => subcommand
          .reply((message, actions, channelName) => actions
            .channel(channelName)
            .then(channel => slackFeedStore.followsFor(channel)
              .then(users => {
                const link = FeedChannel.linkFor(channel);
                if (users == null || users.length === 0) {
                  return `I don't publish any tweets to ${link}.`;
                }
                return `I publish tweets for ${users.map(user => slackTweetFormatter.userLink(user.name)).join(' ')} to ${link}.`;
              })
            )
          ))
        .subcommand('follow', null, subcommand => subcommand
          .rest('Publish tweets from $username on channel $name', nameParam => nameParam
            .reply((message, actions, channelName, ...usernames) => actions
              .channel(channelName.replace(/^#/, ''))
              .then(channel => Promise
                .all(usernames.map(un => twitterUserStore.findOneByName(un.replace(/^@/, ''))))
                .then(users => Promise
                  .all(users.map(u => slackFeedStore.follow(channel, u)))
                  .then(() => slackFeedStore
                    .followsFor(channel)
                    .then(followed => {
                      const channelLink = FeedChannel.linkFor(channel);
                      const requestedNames = users.map(u => u.name);
                      const preexistingLinks = followed
                        .filter(f => requestedNames.indexOf(f.name) < 0)
                        .map(u => slackTweetFormatter.userLink(u.name));
                      const requestedLinks = users.map(u => slackTweetFormatter.userLink(u.name));
                      const response: string[] = [];
                      if (requestedLinks.length > 0) {
                        response.push(`I will publish a feed for ${requestedLinks.join(' ')} to ${channelLink}.`);
                      } else {
                        response.push(`I already publish those feeds to ${channelLink}.`);
                      }
                      if (preexistingLinks.length === 0) {
                        response.push('That\'s all I publish to that channel.');
                      } else {
                        response.push(`I also publish ${preexistingLinks.join(' ')} to that channel.`);
                      }
                      return response.join(' ');
                    })
                  )
                )
              )
              .catch(reason => `Could not follow ${usernames.join(' ')} on ${channelName}: ${JSON.stringify(reason)}`)
            )
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
      .reply(() => twitterEventStore.latest.then(tweet => slackTweetFormatter.messagesFromTweet(tweet)))
    )
    .command('latest', null, command => command
      .param('username', 'Show the latest tweet from $username', param => param
        .reply((message, actions, username) => twitterEventStore
          .latestFor(username).then(tweet => {
            if (tweet == null) {
              actions.reply(PostableMessage.from(`I have not seen anything from @${username}`, message.channel))
                .catch(reason => env.debug(`Could not reply: ${JSON.stringify(reason)}`));
              return null;
            }
            return slackTweetFormatter.messagesFromTweet(tweet);
          })
        )
      )
    )
    .help('help')
    .otherwise((message, actions) => {
      const alternatives = actions.commandsLike(message.text);
      let msg = `I don't know what that means: \`${slackTweetFormatter.slackEscape(message.text)}\`.`;
      if (alternatives.length > 0) {
        msg += `  Did you mean one of these?\n${alternatives.map(a => `\`${a.path}\`  ${a.helpText}`).join('\n')}`;
      }
      return msg;
    })
    .start()
    .then(() => env.debug(`Slack client online`));
// wtfnode.dump();
})
;
