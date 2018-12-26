const request = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Response:
//
// {
//     success: number;
//     start: number;
//     total_count: number;
//     topics_html: string;
// }

// 1. Request topics with offset 0 and count 100
// 2. Check if there are more topics left
// 3. Fetch the next 100 topics, and if there are then go to 2.
// 4. Start fetching pages with comments
// 5. Fetch the page starting from 0 with the first 50 comments
// 6. Check if it was the last page, otherwise go to 5.
// 7. Start fetching the next topic.

function requestTopics(appId, subForumPath, pageNumber) {
  const url = 'https://steamcommunity.com/app/' + appId + subForumPath + '/?fp=' + pageNumber;
  const headers = {
    Cookie: 'rgDiscussionPrefs=' + encodeURIComponent(JSON.stringify({ cTopicRepliesPerPage: 50, cTopicsPerPage: 50 }))
  }
  return (
    Promise.resolve(fs.readFileSync(path.resolve(__dirname, './fixture/topics.html')))
    // request({
    //   url, headers
    // })
      .then(response => {
        const $ = cheerio.load(response);
        const topics = []

        $('.forum_topics_container .forum_topic').each((_, $topic) => {
          topics.push({
            topicId: $($topic).attr('data-gidforumtopic'),
            title: $($topic).find('.forum_topic_name').text().trim()
          })
        })

        const totalContainer = $('.forum_paging_header span').get(3);
        const total = $(totalContainer).text();

        return {
          total,
          topics
        }
      })
  )
}

function requestTopicComments(appId, topicId, subForumPath, pageNumber) {
  const url = 'https://steamcommunity.com/app/' + appId + subForumPath + '/' + topicId + '/?ctp=' + pageNumber;

  const headers = {
    Cookie: 'rgDiscussionPrefs=' + encodeURIComponent(JSON.stringify({ cTopicRepliesPerPage: 50, cTopicsPerPage: 50 }))
  }
  return (
    // request({
    //   url,
    //   headers
    // })
    Promise.resolve(fs.readFileSync(path.resolve(__dirname, './fixture/comments.html'), 'utf8'))
      .then(response => {
        const $ = cheerio.load(response)
        const comments = $('.commentthread_comment')
        const op = $('.forum_op')

        console.log(op.html());
      })
  )
}

requestTopics(711660, '/discussions/0', 1)
  .then(data => {
    const { topics } = data;
    const { topicId } = topics[0];

    return requestTopicComments(711660, topicId, '/discussions/0', 1)
  })
  .then(console.log)
  .catch(console.log);
