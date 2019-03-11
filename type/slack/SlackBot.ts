import {CommandSummary, EventuallyPostable, SlackClient} from './SlackClient';
import {FeedChannel, FeedStore} from './FeedStore';
import env from '../../lib/env';
import {SlackTweetFormatter} from './SlackTweetFormatter';
import {TwitterUser, TwitterUserStore} from '../twitter/TwitterUser';
import {TweetStore} from '../twitter/TweetStore';
import {TwitterEventStore} from '../twitter/TwitterEventStore';
import {Tweet} from '../twitter/Tweet';
import {PostableMessage} from './PostableMessage';
import {TwitterClient} from '../twitter/TwitterClient';
import {Config} from '../Config';

function regexify(stringOrPattern: string | RegExp): RegExp {
  return stringOrPattern instanceof RegExp ? stringOrPattern : new RegExp(stringOrPattern, 'i');
}

export class Command {

  static readonly SPLAT = /(?:(\S+)\s*)*/g;
  public readonly children: Command[] = [];

  constructor(
    public readonly client: SlackClient,
    public readonly literal: string,
    public readonly paramName: string,
    public readonly pattern: RegExp,
    public readonly helpText?: string,
    public readonly parent: Command = null,
  ) {
  }

  get matcher(): RegExp {
    const fromParent = (this.parent == null ? '^' : (this.parent.matcher.source + '\\s+'));
    const thisPattern = this.literal != null ? this.literal
      : this.paramName != null ? ('(?<' + this.paramName + '>\\S+)')
        : this.pattern.source;
    return new RegExp(fromParent + thisPattern, 'i');
  }

  get path(): string {
    return (this.parent == null ? '' : (this.parent.path + ' '))
      + (this.literal
        || (this.paramName == null ? null : '$' + this.paramName)
        || (this.pattern === Command.SPLAT ? '...' : this.pattern.source));
  }

  public param(name: string, helpText: string = null, callback: (subcommand: Command) => void): this {
    const command = new Command(this.client, null, name, null, helpText, this);
    this.children.push(command);
    callback(command);
    return this;
  }

  public reply(eventually: EventuallyPostable, thread: boolean = false): this {
    this.client.replyTo(this.matcher, eventually, thread);
    return this;
  }

  public rest(helpText: string = null, callback: (subcommand: Command) => void): this {
    const command = new Command(this.client, null, null, Command.SPLAT, helpText, this);
    this.children.push(command);
    callback(command);
    return this;
  }

  public subcommand(name: string, helpText: string = null, callback: (subcommand: Command) => void): this {
    const command = new Command(this.client, name, null, null, helpText, this);
    this.children.push(command);
    callback(command);
    return this;
  }
}

export class SlackBot {

  constructor(
    private readonly slackClient: SlackClient,
    private readonly slackFeedStore: FeedStore,
    private readonly slackTweetFormatter: SlackTweetFormatter,
    private readonly twitterUserStore: TwitterUserStore,
    private readonly tweetStore: TweetStore,
    private readonly twitterEventStore: TwitterEventStore,
    private readonly twitterClient: TwitterClient,
    private readonly config: Config,
  ) {
  }

  private readonly commands: Command[] = [];

  static getInstance(
    slackClient: SlackClient,
    slackTweetFormatter: SlackTweetFormatter,
    feedStore: FeedStore,
    twitterUserStore: TwitterUserStore,
    tweetStore: TweetStore,
    twitterEventStore: TwitterEventStore,
    twitterClient: TwitterClient,
    config: Config,
  ): Promise<SlackBot> {
    return new SlackBot(
      slackClient, feedStore, slackTweetFormatter,
      twitterUserStore, tweetStore, twitterEventStore, twitterClient, config
    ).start();
  }

  public command(key: string | RegExp, helpText: string = null, callback?: (command: Command) => void): void {
    const command = new Command(this.slackClient, typeof key === 'string' ? key : null, null, key instanceof RegExp ? key : null, helpText);
    this.commands.push(command);
    callback(command);
  }

  private commandsLike(text: string): CommandSummary[] {
    const words = text.split(/\s+/g);
    const results: CommandSummary[] = [];
    for (const command of this.commands) {
      const path: string = command.path;
      const helpText: string = command.helpText;
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

    function addHelp(command: Command) {
      if (command.helpText != null) {
        lines.push(`\`${command.path}\`  ${command.helpText}`);
      }
      command.children.forEach(addHelp);
    }

    this.commands.forEach(addHelp);
    this.slackClient.replyTo(regexify(key), lines.join('\n'));
  }

  public messagesFromTweet(tweet: Tweet): PostableMessage[] {
    return this.slackTweetFormatter.messagesFromTweet(tweet);
  }

  // noinspection JSMethodCanBeStatic
  public otherwise(messageSupplier: EventuallyPostable): void {
    this.slackClient.onMessage(this.slackClient.replier(messageSupplier));
  }

  public send(message: PostableMessage): Promise<void> {
    return this.slackClient.send(message);
  }

  private start(): Promise<this> {
    this.command('ping', 'See if I\'m online.', command => command.reply('pong'));
    this.command('identify', null, command => command
      .param('name', 'Fetch information about a twitterer', param => param
        .reply((message, actions, name) => this.twitterClient
          .fetchUser(name)
          .then((fetched: TwitterUser) => {
            if (fetched == null) {
              return `Could not find a Twitter user named \`${this.slackTweetFormatter.slackEscape(name)}\``;
            }
            return this.twitterUserStore.merge(fetched).then(merged => {
              this.twitterClient.addUsers(merged).connect();
              const linkedName = this.slackTweetFormatter.userLink(merged.name);
              const fullName = this.slackTweetFormatter.slackEscape(merged.fullName);
              return `Followed ${linkedName} (${fullName}).`;
            });
          })
        )
      )
    );
    this.command('channels', 'What channels am I aware of?', command => command
      .reply(() => this.slackFeedStore.channels.then(channels => {
          if (channels == null || channels.length === 0) {
            return `I am not in any channels at the moment.`;
          }
          return `I am available in: ${channels.map(c => FeedChannel.linkFor(c)).join(' ')}.`;
        })
      )
    );
    this.command('channel', null, command => command
      .param('name', null, channelParam => channelParam
        .subcommand('create', 'Create a feed for a channel.', subcommand => subcommand
          .reply((message, actions, channelName) => actions
            .channel(channelName)
            .then(channel => {
              if (channel == null) {
                return `That's not a channel or I don't have access to it.`;
              }
              return this.slackFeedStore.createFeed(channel).then(feed => `I will publish a feed to ${feed.link}`);
            })
            .catch(reason => {
              env.debug(`Could not resolve channel ${channelName}: ${JSON.stringify(reason)}`);
              return `Could not resolve channel ${channelName}`;
            })
          )
        )
        .subcommand('follows', 'Show follows published to a channel', subcommand => subcommand
          .reply((message, actions, channelName) => actions
            .channel(channelName)
            .then(channel => this.slackFeedStore.followsFor(channel)
              .then(users => {
                const link = FeedChannel.linkFor(channel);
                if (users == null || users.length === 0) {
                  return `I don't publish any tweets to ${link}.`;
                }
                return `I publish tweets for ${users.map(user => this.slackTweetFormatter.userLink(user.name)).join(' ')} to ${link}.`;
              })
            )
          ))
        .subcommand('follow', null, subcommand => subcommand
          .rest('Publish tweets from $username on channel $name', nameParam => nameParam
            .reply((message, actions, channelName, ...usernames) => actions
              .channel(channelName.replace(/^#/, ''))
              .then(channel => Promise
                .all(usernames.map(un => this.twitterUserStore.findOneByName(un.replace(/^@/, ''))))
                .then(users => Promise
                  .all(users.map(u => this.slackFeedStore.follow(channel, u)))
                  .then(() => this.slackFeedStore
                    .followsFor(channel)
                    .then(followed => {
                      const channelLink = FeedChannel.linkFor(channel);
                      const requestedNames = users.map(u => u.name);
                      const preexistingLinks = followed
                        .filter(f => requestedNames.indexOf(f.name) < 0)
                        .map(u => this.slackTweetFormatter.userLink(u.name));
                      const requestedLinks = users.map(u => this.slackTweetFormatter.userLink(u.name));
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
    );
    this.command('follows', 'Show the twitterers I\'m following', command => command
      .reply(() => this.tweetStore.follows()
        .then(follows => {
          if (follows == null || follows.length === 0) {
            return `I'm not currently following anyone.`;
          }
          return `I'm following: ${follows.map(user => user.name).map(name => this.slackTweetFormatter.userLink(name)).join(' ')}`;
        })
      )
    );
    this.command('latest', null, command => command
      .subcommand('tweet', 'Show the latest tweet I\'ve tracked (no RTs or replies)', latestTweet => latestTweet
        .reply(() => this.twitterEventStore.latest().then(tweet => this.slackTweetFormatter.messagesFromTweet(tweet)))
      )
      .subcommand('retweet', 'Show the latest tweet I\'ve tracked (with RTs)', latestTweet => latestTweet
        .reply(() => this.twitterEventStore.latest(true).then(tweet => this.slackTweetFormatter.messagesFromTweet(tweet)))
      )
      .subcommand('reply', 'Show the latest tweet I\'ve tracked (with replies)', latestTweet => latestTweet
        .reply(() => this.twitterEventStore.latest(false, true).then(tweet => this.slackTweetFormatter.messagesFromTweet(tweet)))
      )
      .param('username', 'Show the latest tweet from $username', param => param
        .reply((message, actions, username) => this.twitterEventStore
          .latestFor(username).then(tweet => {
            if (tweet == null) {
              actions.reply(PostableMessage.from(`I have not seen anything from @${username}`, message.channel))
                .catch(reason => env.debug(`Could not reply: ${JSON.stringify(reason)}`));
              return null;
            }
            return this.messagesFromTweet(tweet);
          })
        )
      )
    );
    this.command('about', 'Show version and configuration information', command => {
      command.reply(`Scrubjay build ${this.config.version || '?'}`);
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
    return this.slackClient
      .start()
      .then(() => env.debug(`Slack client online`))
      .then(() => this);
  }

}
