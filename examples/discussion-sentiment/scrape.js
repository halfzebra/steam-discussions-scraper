const path = require('path');
const Sentiment = require('sentiment');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const {  scrapeTopicsInSubForum, scrapeCommentsInTopic } = require('../../index');

const adapter = new FileSync(path.resolve(__dirname, 'db.json'))
const db = low(adapter)

db.defaults({ topics: [], comments: [] })
  .write()

const sentiment = new Sentiment();

async function main() {
	try {
		// https://steamcommunity.com/app/251830/discussions/
		const appId = 251830;
		const subForumPath = '/discussions/0';

		console.log();
		console.log(`Scraping https://steamcommunity.com/app/${appId}${subForumPath}`);
		console.log();

    const topics = await scrapeTopicsInSubForum(appId, subForumPath);

    const topicsFlat = topics.reduce((acc, curr) => [ ...acc, ...curr ], []);

    db.get('topics')
      .push(...topicsFlat)
      .write()

		console.log(topicsFlat);
    process.exit(0);

    topicsFlat.forEach(async topic => {
      const comments = await scrapeCommentsInTopic(appId, subForumPath, topic.id);
      db.get('comments')
        .push(...comments)
        .write()
    })

	} catch (error) {
		console.log(error);
		process.exit(1);
	}
}

main();
