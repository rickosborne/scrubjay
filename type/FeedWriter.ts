import {config} from './Config';
import {Identity} from './Identity';
import {Feed} from 'feed';
import * as fs from 'fs';
import * as path from 'path';
import env from '../lib/env';

export class FeedWriter {
  private outputPath: string;

  constructor() {
    this.outputPath = config.outputPath;
  }

  publish(identity: Identity) {
    const feedId = `${config.baseUrl}/${identity.slug}`;
    identity.recentTweets(20).then(tweets => {
      const feed = new Feed({
        title: identity.name,
        id: feedId,
        copyright: identity.name,
        feedLinks: {},
        author: {
          name: identity.name
        },
        updated: tweets[0].created,
      });
      for (const tweet of tweets) {
        feed.addItem({
          author: [{
            name: tweet.user.name,
          }],
          content: tweet.text,
          date: tweet.created,
          title: `${tweet.created}`,
          link: `${feedId}/tweet/${tweet.id}`,
          id: `tweet${tweet.id}`,
          published: tweet.created,
        });
      }
      const basePath = path.join(config.outputPath, identity.slug);
      const atomPath = path.join(basePath, 'atom.xml');
      fs.writeFile(atomPath, feed.atom1(), {encoding: 'utf8'}, env.debugFailure(() => `Failed to write ${atomPath}`));
      const rssPath = path.join(basePath, 'rss.xml');
      fs.writeFile(rssPath, feed.rss2(), {encoding: 'utf8'}, env.debugFailure(() => `Failed to write ${rssPath}`));
    });
  }
}
