const axios = require('axios');
const cheerio = require('cheerio');

// Response:
//
// {
//     total: number;
//     offset: number;
//     count: number;
//     topics: []{ id: number; title: string; }
// }

function requestSubForumPage(appId, subForumPath, pageNumber) {
	const url = 'https://steamcommunity.com/app/' + appId + subForumPath + '/?fp=' + pageNumber;
	const headers = {
		Cookie:
			'rgDiscussionPrefs=' + encodeURIComponent(JSON.stringify({ cTopicRepliesPerPage: 50, cTopicsPerPage: 50 }))
	};

	return axios.get(url, {
		headers
	});
}

async function scrapeTopicsPage(appId, subForumPath, pageNumber) {
	try {
		const { data } = await requestSubForumPage(appId, subForumPath, pageNumber);
		const offset = (pageNumber - 1) * 50;
		const topics = [];
		const $ = cheerio.load(data);

		$('.forum_topics_container .forum_topic').each((_, topicHtml) => {
			topics.push({
				id: $(topicHtml).attr('data-gidforumtopic'),
				title: $(topicHtml).find('.forum_topic_name').text().trim()
			});
		});

		const count = topics.length;
		const totalContainer = $('.forum_paging_header span').get(3);
		const total = $(totalContainer).text();

		return {
			total,
			offset,
			count,
			topics
		};
	} catch (error) {
		throw error;
	}
}

// Response:
//
// {
//     offset: number;
//     count: number;
//     comments: []{
//      author: string;
//      date: string;
//      hasGame: bool;
//      text: string;
//     };
// }

function scrapeTopicOp($) {
	const $op = $('.forum_op');
	const timestamp = parseInt($op.find('.date').attr('data-timestamp'));
	const date = new Date(timestamp * 1000);
	const title = $op.find('.topic').text().trim();
	const html = $op.find('.content').html();
	const author = $op.find('.forum_op_author').attr('href');

	return {
		author,
		title,
		date,
		html
	};
}

function scrapeTopicComments($) {
	const comments = [];

	$('.commentthread_comment').each((index, commentHtml) => {
		const $comment = $(commentHtml);
		const timestamp = $comment.find('.commentthread_comment_timestamp').attr('data-timestamp');
		comments.push({
			author: $comment.find('.commentthread_author_link').attr('href'),
			date: new Date(timestamp * 1000),
			html: $comment.find('.commentthread_comment_text').html().trim(),
			hasGame: $comment.find('.commentthread_comment_author > img').length === 1
		});
	});

	return comments;
}

function requestCommentsPage(appId, topicId, subForumPath, pageNumber) {
	const url = 'https://steamcommunity.com/app/' + appId + subForumPath + '/' + topicId + '/?ctp=' + pageNumber;
	const headers = {
		Cookie:
			'rgDiscussionPrefs=' + encodeURIComponent(JSON.stringify({ cTopicRepliesPerPage: 50, cTopicsPerPage: 50 }))
	};

	return axios.get(url, {
		headers
	});
}

async function scrapeCommentsPage(appId, topicId, subForumPath, pageNumber) {
	try {
		const offset = (pageNumber - 1) * 50;
		const { data } = await requestCommentsPage(appId, topicId, subForumPath, pageNumber);

		const $ = cheerio.load(data);
		const comments = scrapeTopicComments($).map(data => ({ ...data, topicId }));
		const count = comments.length;

		// totalComments
		const totalContainer = $($('.forum_paging_summary').get(0)).find('span').get(2);
		const total = parseInt($(totalContainer).text());

		return {
			total,
			offset,
			count,
			comments
		};
	} catch (error) {
		throw error;
	}
}

async function scrapeTopicsInSubForum(appId, subForumPath) {
	let page = 1;
	let done = false;

	let allTopics = [];

	while (!done) {
		const { total, topics } = await scrapeTopicsPage(appId, subForumPath, page);
		allTopics.push(...topics);

		if (total > page * 50) {
			page++;
		} else {
			done = true;
		}
	}

	return allTopics;
}

async function scrapeCommentsInTopic(appId, subForumPath, topicId) {
	let page = 1;
	let done = false;
	let allComments = [];

	while (!done) {
		const { total, comments } = await scrapeCommentsPage(appId, topicId, subForumPath, page);
		allComments.push(...comments);

		if (total > page * 50) {
			page++;
		} else {
			done = true;
		}
	}

	return allComments;
}

module.exports = { requestSubForumPage, requestCommentsPage, scrapeTopicsInSubForum, scrapeCommentsInTopic };
