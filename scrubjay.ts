'use strict';

import env from './lib/env';

env.debug(() => `scrubjay`);
import {migrator} from './lib/schema';
import {twitterClient} from './type/TwitterClient';
import {tweetStore} from './type/TweetStore';
// import * as wtfnode from 'wtfnode';

migrator.onReady(() => {
  tweetStore.follows()
    .then(users => {
      twitterClient.addUsers(...(users.map(user => '' + user.id)));
      twitterClient.onTweet(tweet => {
        tweet.user.identity.then(identity => {
          if (identity != null) {
            // feedWriter.publish(identity);
          }
        });
      });

      twitterClient.connect();
    });
  // wtfnode.dump();
});
