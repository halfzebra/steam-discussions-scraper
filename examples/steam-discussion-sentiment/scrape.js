const path = require('path');
const Sentiment = require('sentiment');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const ProgressBar = require('progress');

const { scrapeTopicsInSubForum, scrapeCommentsInTopic } = require('../../lib');

const adapter = new FileSync(path.resolve(__dirname, 'db.json'));
const db = low(adapter);

db.defaults({ topics: [], comments: [] }).write();

const sentiment = new Sentiment();

async function main() {
	try {
		const appId = 251830;
		const subForumPath = '/discussions/0';

		console.log();
		console.log(`Scraping https://steamcommunity.com/app/${appId}${subForumPath}`);
		console.log();

    const topics = await scrapeTopicsInSubForum(appId, subForumPath);

    const { length } = topics;
    let i = length;
    const bar = new ProgressBar(':bar', { total: length });

    db.get('topics').push(...topics).write();

    while (i > 0) {
      const comments = await scrapeCommentsInTopic(appId, subForumPath, topics[ length - i ].id);
      db.get('comments').push(...comments).write();
      bar.tick();
      i--;
    }

    console.log()
    console.log('Complete!');
    console.log()
    process.exit(0);
	} catch (error) {
		console.log(error);
		process.exit(1);
	}
}

main();
