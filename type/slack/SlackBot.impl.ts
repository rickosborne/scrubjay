import {CommandSummary, EventuallyPostable, OnMessageActions, SlackClient} from './SlackClient';
import {FeedStore} from './FeedStore';
import {SlackTweetFormatter} from './SlackTweetFormatter';
import {TwitterUserStore} from '../twitter/store/TwitterUserStore';
import {TweetStore} from '../twitter/store/TweetStore';
import {TwitterEventStore} from '../twitter/store/TwitterEventStore';
import {TwitterClient, TwitterClientState} from '../twitter/TwitterClient';
import {ScrubjayConfig} from '../config/ScrubjayConfig';
import {Tweet} from '../twitter/Tweet';
import {PostableMessage} from './PostableMessage';
import {TwitterUser} from '../twitter/TwitterUser';
import env from '../../lib/env';
import {RenderOptions, SlackBot} from './SlackBot';
import {SlackBotCommand} from './SlackBotCommand';
import {formatDurationMS, getDateYYYYMMDD, getLongDateTime, getTimeHHMMSS} from '../../lib/time';
import {ScrubjayConfigStore} from '../config/ScrubjayConfigStore';
import {plural} from '../../lib/plural';
import {DirectMessage} from './DirectMessage';
import {NotifyQueue} from '../NotifyQueue';

class CommandImpl implements SlackBotCommand {

  static readonly SPLAT = /(?:(\S+)\s*)*/g;
  public readonly children: CommandImpl[] = [];

  constructor(
    public readonly client: SlackClient,
    public readonly literal?: string,
    public readonly paramName?: string,
    public readonly pattern?: RegExp,
    public readonly helpText?: string,
    public readonly parent?: CommandImpl,
  ) {
  }

  get matcher(): RegExp {
    const fromParent = (this.parent == null ? '^' : (this.parent.matcher.source + '\\s+'));
    const thisPattern = this.literal != null ? this.literal
      : this.paramName != null ? ('(?<' + this.paramName + '>\\S+)')
        : this.pattern != null ? this.pattern.source : undefined;
    if (thisPattern == null) {
      throw new Error(`Unable to build pattern: ${JSON.stringify(this)}`);
    }
    return new RegExp(fromParent + thisPattern, 'i');
  }

  get path(): string {
    return (this.parent == null ? '' : (this.parent.path + ' '))
      + (this.literal
        || (this.paramName == null ? null : '$' + this.paramName)
        || (this.pattern === CommandImpl.SPLAT ? '...' : this.pattern == null ? '!!!' : this.pattern.source));
  }

  public param(name: string, helpText: string | undefined, callback: (subcommand: SlackBotCommand) => void): this {
    const command = new CommandImpl(this.client, undefined, name, undefined, helpText, this);
    this.children.push(command);
    callback(command);
    return this;
  }

  public reply(eventually: EventuallyPostable, thread: boolean = false): this {
    this.client.replyTo(this.matcher, eventually, thread);
    return this;
  }

  public rest(helpText: string | undefined, callback: (subcommand: SlackBotCommand) => void): this {
    const command = new CommandImpl(this.client, undefined, undefined, CommandImpl.SPLAT, helpText, this);
    this.children.push(command);
    callback(command);
    return this;
  }

  public subcommand(name: string, helpText: string | undefined, callback: (subcommand: SlackBotCommand) => void): this {
    const command = new CommandImpl(this.client, name, undefined, undefined, helpText, this);
    this.children.push(command);
    callback(command);
    return this;
  }
}

function regexify(stringOrPattern: string | RegExp): RegExp {
  return stringOrPattern instanceof RegExp ? stringOrPattern : new RegExp(stringOrPattern, 'i');
}

// noinspection JSUnusedGlobalSymbols
export class SlackBotImpl implements SlackBot {

  protected constructor(
    private readonly slackClient: SlackClient,
    private readonly slackFeedStore: FeedStore,
    private readonly slackTweetFormatter: SlackTweetFormatter,
    private readonly twitterUserStore: TwitterUserStore,
    private readonly tweetStore: TweetStore,
    private readonly twitterEventStore: TwitterEventStore,
    private readonly twitterClient: TwitterClient,
    private readonly config: ScrubjayConfig,
    private readonly configStore: ScrubjayConfigStore,
    private readonly notifyQueue: NotifyQueue,
  ) {
  }

  protected get startTime(): string {
    return `${getLongDateTime(this._startTime)}`;
  }

  public get uptime(): string {
    const elapsedMS = (new Date()).valueOf() - this._startTime.valueOf();
    return formatDurationMS(elapsedMS);
  }

  private readonly _startTime: Date = new Date();
  private readonly commands: SlackBotCommand[] = [];

  @SlackBot.supplier
  public static getInstance(
    @SlackClient.required slackClient: SlackClient,
    @FeedStore.required slackFeedStore: FeedStore,
    @SlackTweetFormatter.required slackTweetFormatter: SlackTweetFormatter,
    @TwitterUserStore.required twitterUserStore: TwitterUserStore,
    @TweetStore.required tweetStore: TweetStore,
    @TwitterEventStore.required twitterEventStore: TwitterEventStore,
    @TwitterClient.required twitterClient: TwitterClient,
    @ScrubjayConfig.required config: ScrubjayConfig,
    @ScrubjayConfigStore.required configStore: ScrubjayConfigStore,
    @NotifyQueue.required notifyQueue: NotifyQueue,
  ): SlackBot {
    const bot = new SlackBotImpl(
      slackClient, slackFeedStore, slackTweetFormatter,
      twitterUserStore, tweetStore, twitterEventStore, twitterClient,
      config, configStore, notifyQueue,
    );
    return bot.start();
  }

  public command(
    key: string | RegExp,
    helpText?: string,
    callback?: (command: SlackBotCommand) => void
  ): void {
    const command = new CommandImpl(
      this.slackClient,
      typeof key === 'string' ? key : undefined,
      undefined,
      key instanceof RegExp ? key : undefined,
      helpText
    );
    this.commands.push(command);
    if (callback != null) {
      callback(command);
    }
  }

  private commandsLike(text: string): CommandSummary[] {
    const words = text.split(/\s+/g);
    const results: CommandSummary[] = [];
    for (const command of this.commands) {
      const path: string = command.path;
      const helpText: string | undefined = command.helpText;
      for (const word of words) {
        if (helpText != null && path.indexOf(word) >= 0 && results.filter(r => r.path === path).length === 0) {
          results.push({path, helpText});
        }
      }
    }
    return results;
  }

  public help(key: string | RegExp): void {
    const lines: string[] = ['I know the following commands:'];

    function addHelp(command: SlackBotCommand) {
      if (command.helpText != null) {
        lines.push(`\`${command.path}\`  ${command.helpText}`);
      }
      command.children.forEach(addHelp);
    }

    this.commands.forEach(addHelp);
    this.slackClient.replyTo(regexify(key), lines.join('\n'));
  }

  public messagesFromTweet(tweet: Tweet, options: RenderOptions = {}): PostableMessage[] {
    return this.slackTweetFormatter.messagesFromTweet(tweet, options);
  }

  public otherwise(messageSupplier: EventuallyPostable): void {
    this.slackClient.onMessage(this.slackClient.replier(messageSupplier));
  }

  public send(message: PostableMessage): Promise<void> {
    return this.slackClient.send(message);
  }

  private start(): this {
    this.command('ping', 'See if I\'m online.', command => command.reply('pong'));
    this.command('identify', undefined, (command) => command
      .param('name', 'Fetch information about a twitterer', param => param
        .reply(async (message: DirectMessage, actions: OnMessageActions, name: string) => {
          const followerEmoji = await this.configStore.followEmoji;
          const fetched = await this.twitterClient.fetchUser(name);
          if (fetched == null) {
            return `Could not find a Twitter user named \`${this.slackTweetFormatter.slackEscape(name)}\``;
          }
          return this.twitterUserStore.merge(fetched).then(merged => {
            if (merged == null) {
              return `Could not merge user ${name}.`;
            }
            if (fetched.name == null) {
              return `Twitter user ${fetched.id} has no name.`;
            }
            this.twitterClient.addUsers(merged).connect();
            const linkedName = this.slackTweetFormatter.userLink(fetched.name, followerEmoji);
            const fullName = fetched.fullName == null ? '' : ' (' + this.slackTweetFormatter.slackEscape(fetched.fullName) + ')';
            return `Followed ${linkedName}${fullName}.`;
          });
        })
      )
    );
    this.command('channels', 'What channels am I aware of?', command => command
      .reply(() => this.slackFeedStore.channels.then(channels => {
          if (channels == null || channels.length === 0) {
            return `I am not in any channels at the moment.`;
          }
          return `I am available in: ${channels.map(c => this.slackTweetFormatter.linkForChannel(c)).join(' ')}.`;
        })
      )
    );
    this.command('channel', undefined, (command) => command
      .param('name', undefined, (channelParam) => channelParam
          .subcommand('create', 'Create a feed for a channel.', (subcommand) => subcommand
            .reply(async (message, actions, channelName) => {
              const channel = await actions.channel(channelName);
              if (channel == null) {
                return `That's not a channel or I don't have access to it.`;
              }
              return this.slackFeedStore
                .createFeed(channel)
                .then(feed => `I will publish a feed to ${this.slackTweetFormatter.linkForChannel(feed)}`);
            })
          )
          .subcommand('follows', 'Show follows published to a channel', (subcommand) => subcommand
            .reply(async (message, actions, channelName) => {
              const channel = await actions.channel(channelName);
              if (channel == null) {
                return `I don't publish to \`${this.slackTweetFormatter.slackEscape(channelName)}\`.`;
              }
              const users = await this.slackFeedStore.followsFor(channel);
              const link = this.slackTweetFormatter.linkForChannel(channel);
              if (users == null || users.length === 0) {
                return `I don't publish any tweets to ${link}.`;
              }
              const followerEmoji = await this.configStore.followEmoji;
              const userLinks = users
                .map(user => user.name == null ? '?' : this.slackTweetFormatter.userLink(user.name, followerEmoji))
                .join(' ');
              return `I publish tweets for ${userLinks} to ${link}.`;
            }))
          .subcommand('follow', undefined, (subcommand) => subcommand
            .rest('Publish tweets from $username on channel $name', (nameParam) => nameParam
              .reply(async (message, actions, channelName, ...usernames) => {
                const channel = await actions.channel(channelName);
                if (channel == null) {
                  return `Unknown channel ${channelName}`;
                }
                const maybeUsers = await Promise.all(usernames.map(un => this.twitterUserStore.findOneByName(un.replace(/^@/, ''))));
                const users: TwitterUser[] = maybeUsers.filter(u => u != null) as any as TwitterUser[];
                if (users.length !== maybeUsers.length) {
                  return `Not all users are valid`;
                }
                users.map(u => this.slackFeedStore.follow(channel, u));
                const followerEmoji = await this.configStore.followEmoji;
                const followed = await this.slackFeedStore.followsFor(channel);
                const channelLink = this.slackTweetFormatter.linkForChannel(channel);
                const requestedNames = users.map(u => u.name);
                const preexistingLinks = followed
                  .filter(f => requestedNames.indexOf(f.name) < 0)
                  .map(u => this.slackTweetFormatter.userLink(u.name || '?', followerEmoji));
                const requestedLinks = users.map(u => this.slackTweetFormatter.userLink(u.name || '?', followerEmoji));
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
        // // This is currently limited to users, not bots
        // .subcommand('sync', 'Update the topic of the channel with the follow list', syncCommand => syncCommand
        //   .reply((message, actions, channelName) => actions
        //     .channel(channelName)
        //     .then(channel => this.slackFeedStore.followsFor(channel)
        //       .then(users => this.slackClient.setTopic(channel, users.map(user => user.name).join(' ')))
        //       .then(success => `Topic in ${this.slackTweetFormatter.linkForChannel(channel)} `
        //         + (success ? 'updated.' : 'could not be updated.'))
        //     )
        //   )
        // )
      )
    );
    this.command('follows', 'Show the twitterers I\'m following', command => command
      .reply(() => this.configStore.followEmoji.then(followerEmoji => this.tweetStore
          .follows()
          .then(follows => {
            if (follows == null || follows.length === 0) {
              return `I'm not currently following anyone.`;
            }
            const userLinks = follows
              .map(user => user.name)
              .map(name => this.slackTweetFormatter.userLink(name || '?', followerEmoji));
            return `I'm following: ${userLinks.join(' ')}`;
          })
        )
      )
    );
    this.command('latest', undefined, command => command
      .subcommand('tweet', 'Show the latest tweet I\'ve tracked (no RTs or replies)', (latestTweet) => latestTweet
        .reply(() => this.configStore.followEmoji
          .then(followEmoji => this.twitterEventStore
            .latest()
            .then(tweet => {
              if (tweet == null) {
                return `No tweets tracked at the moment.`;
              }
              return this.slackTweetFormatter.messagesFromTweet(tweet, {followEmoji});
            })
          )
        )
      )
      .subcommand('retweet', 'Show the latest tweet I\'ve tracked (with RTs)', latestTweet => latestTweet
        .reply(() => this.configStore.followEmoji
          .then(followEmoji => this.twitterEventStore
            .latest(true)
            .then(tweet => {
              if (tweet == null) {
                return `No retweets tracked at the moment.`;
              }
              return this.slackTweetFormatter.messagesFromTweet(tweet, {followEmoji});
            })
          )
        )
      )
      .subcommand('reply', 'Show the latest tweet I\'ve tracked (with replies)', latestTweet => latestTweet
        .reply(() => this.configStore.followEmoji
          .then(followEmoji => this.twitterEventStore
            .latest(false, true)
            .then(tweet => {
              if (tweet == null) {
                return `No replies tracked at the moment.`;
              }
              return this.slackTweetFormatter.messagesFromTweet(tweet, {followEmoji});
            })
          )
        )
      )
      .param('username', 'Show the latest tweet from $username', param => param
        .reply(async (message, actions, username) => {
          const followEmoji = await this.configStore.followEmoji;
          const tweet = await this.twitterEventStore.latestFor(username);
          if (tweet == null) {
            const msg = `I have not seen anything from ${this.slackTweetFormatter.userLink(username, followEmoji)}`;
            return PostableMessage.fromText(msg, message.channel);
          }
          return this.messagesFromTweet(tweet, {followEmoji});
        })
      )
    );
    this.command('backfill', undefined, backfillCommand => backfillCommand
      .param('username', 'Fetch recent tweets for the user', usernameParam => usernameParam
        .reply((message, actions, username) => this.twitterUserStore.findOneByName(username)
          .then(user => {
              if (user == null) {
                return `I am not following anyone named \`${this.slackTweetFormatter.slackEscape(username)}\`.`;
              }
              return this.configStore.followEmoji
                .then(followEmoji => this.twitterClient
                  .recent(user)
                  .then(tweets => {
                    const count = tweets.length;
                    const didSaveTweet: Promise<boolean>[] = [];
                    tweets.forEach(([tweet, json]) => {
                      didSaveTweet.push(this.tweetStore.store(tweet));
                      this.twitterEventStore.save(json);
                    });
                    return Promise.all(didSaveTweet)
                      .then(([...saved]) => {
                        const didSave = saved.filter(v => v).length;
                        const userLink = this.slackTweetFormatter.userLink(username, followEmoji);
                        return `Backfilled ${count} tweet${plural(count)}, ${didSave} new, for ${userLink}.`;
                      });
                  })
                );
            }
          )
        )
      )
    );
    this.command('tweet', undefined, onTweet => onTweet
      .param('statusId', 'Show a specific tweet', statusIdParam => statusIdParam
        .reply((message, actions, statusId) => this.configStore.followEmoji.then(followEmoji => this.twitterEventStore
            .findById(statusId).then(tweet => {
              if (tweet == null) {
                return `I don't have a record of that tweet.`;
              }
              return this.messagesFromTweet(tweet, {followEmoji});
            })
          )
        )
      )
    );
    this.command('summary', 'Show all known channels and follows', summaryCommand => summaryCommand
      .reply(() => this.configStore.followEmoji
        .then(followerEmoji => this.slackFeedStore
          .channelsAndFollows()
          .then(summaries => `I am publishing these feeds:\n` + summaries
            .map(summary => {
              const channelLink = this.slackTweetFormatter.linkForChannel(summary.channel);
              const userLinks = summary.followNames.map(name => this.slackTweetFormatter.userLink(name, followerEmoji)).join(' ');
              return `${channelLink}: ${userLinks}`;
            })
            .concat([
              `I have seen ${this.twitterClient.tweetsSinceLastConnect} tweets since my last reconnect.`,
              this.twitterClient.state === TwitterClientState.CONNECTED && this.twitterClient.lastConnectedTime != null
                ? `I've been connected to Twitter for ${formatDurationMS(Date.now() - this.twitterClient.lastConnectedTime.valueOf())}.`
                : this.twitterClient.state === TwitterClientState.DISCONNECTED
                ? `I'm not currently connected to Twitter.`
                : `My Twitter client is currently: \`${this.twitterClient.state}\`.`,
            ])
            .join('\n')
          )
        )
      )
    );
    this.command('notifications', 'Show the most recent notifications', notificationsCommand => notificationsCommand
      .reply(() => {
        return this.notifyQueue.recent.length === 0 ? `No recent notifications.`
          : `Recent notifications: \`${this.notifyQueue.recent.length}\`:\n`
          + ['```']
            .concat(this.notifyQueue.recent.map(notification => {
              const datePart = getDateYYYYMMDD(notification.time);
              const timePart = getTimeHHMMSS(notification.time);
              const messagePart = this.slackTweetFormatter.slackEscape(notification.message);
              return `${datePart} ${timePart}: ${messagePart}`;
            }))
            .concat(['```'])
            .join('\n')
          ;
      })
    );
    this.command('uptime', 'Time online since the last restart or upgrade', uptimeCommand => uptimeCommand
      .reply(() => `It's been ${this.uptime} since ${this.startTime}.`)
    );
    this.command('about', 'Show version and configuration information', command => {
      command.reply(`Scrubjay release ${this.config.version || '?'}`);
    });
    this.help('help');
    this.otherwise(message => {
      const alternatives = this.commandsLike(message.text);
      let msg = `I don't know what that means: \`${this.slackTweetFormatter.slackEscape(message.text)}\`.`;
      if (alternatives.length > 0) {
        msg += `  Did you mean one of these?\n${alternatives.map(a => `\`${a.path}\`  ${a.helpText}`).join('\n')}`;
      }
      return msg;
    });
    this.slackClient
      .start()
      .then(() => {
        env.debug(`Slack client online`);
        this.notifyQueue.put(`Scrubjay \`${this.config.version}\` online.`);
      });
    return this;
  }

}
