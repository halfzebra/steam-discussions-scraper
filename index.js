const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 1. Request topics with offset 0 and count 100
// 2. Check if there are more topics left
// 3. Fetch the next 100 topics, and if there are then go to 2.
// 4. Start fetching comments for topics if no more topics left
// 5. Fetch the page starting from 0 with the first 50 comments
// 6. Check if it was the last page, otherwise go to 5.
// 7. Start fetching the next topic.

// Response:
//
// {
//     total: number;
//     offset: number;
//     count: number;
//     topics: []{ topicId: number; title: string; }
// }

function requestTopics(appId, subForumPath, pageNumber) {

  const url = 'https://steamcommunity.com/app/' + appId + subForumPath + '/?fp=' + pageNumber;
  const headers = {
    Cookie: 'rgDiscussionPrefs=' + encodeURIComponent(JSON.stringify({ cTopicRepliesPerPage: 50, cTopicsPerPage: 50 }))
  }
  return (
    Promise.resolve({ data: fs.readFileSync(path.resolve(__dirname, './fixture/topics.html')) })

      // axios.get(url, {
      //   headers
      // })
      .then(({ data }) => {
        const offset = (pageNumber - 1) * 50
        const topics = []
        const $ = cheerio.load(data);

        $('.forum_topics_container .forum_topic').each((_, topicHtml) => {
          topics.push({
            topicId: $(topicHtml).attr('data-gidforumtopic'),
            title: $(topicHtml).find('.forum_topic_name').text().trim()
          })
        })


        const count = topics.length;
        const totalContainer = $('.forum_paging_header span').get(3);
        const total = $(totalContainer).text();

        return {
          total,
          offset,
          count,
          topics
        }
      })
  )
}

// Response:
//
// {
//     op: {
//      author: string;
//      title: string;
//      date: string;
//      html: string;
//     };
//     offset: number;
//     count: number;
//     comments: []{
//      author: string;
//      date: string;
//      hasGame: bool;
//      text: string;
//     };
// }

function requestTopicComments(appId, topicId, subForumPath, pageNumber) {
  const offset = (pageNumber - 1) * 50
  const url = 'https://steamcommunity.com/app/' + appId + subForumPath + '/' + topicId + '/?ctp=' + pageNumber;
  const headers = {
    Cookie: 'rgDiscussionPrefs=' + encodeURIComponent(JSON.stringify({ cTopicRepliesPerPage: 50, cTopicsPerPage: 50 }))
  }
  return (
    axios.get(url, {
      headers
    })
    // Promise.resolve({ data: fs.readFileSync(path.resolve(__dirname, './fixture/comments.html'), 'utf8') })
      .then(({ data }) => {
        const $ = cheerio.load(data)

        const comments = [];

        $('.commentthread_comment').each((index, commentHtml) => {
          const $comment = $(commentHtml);
          const timestamp = $comment.find('.commentthread_comment_timestamp').attr('data-timestamp');
          comments.push({
            author: $comment.find('.commentthread_author_link').attr('href'),
            date: new Date(timestamp * 1000),
            html: $comment.find('.commentthread_comment_text').html(),
            hasGame: $comment.find('.commentthread_comment_author > img').length === 1
          })
        });

        const count = comments.length;

        // total
        const totalContainer = $($('.forum_paging_summary').get(0)).find('span').get(2);
        const total = parseInt($(totalContainer).text());

        // op
        const $op = $('.forum_op')
        const timestamp = parseInt($op.find('.date').attr('data-timestamp'));
        const date = new Date(timestamp * 1000);
        const title = $op.find('.topic').text().trim();
        const html = $op.find('.content').html();
        const author = $op.find('.forum_op_author').attr('href')

        const op = {
          author,
          title,
          date,
          html
        }

        return {
          op,
          total,
          offset,
          count,
          comments
        }
      })
  )
}

async function main() {
  try {
    // const { topics } = await requestTopics(711660, '/discussions/0', 1)
    // console.log(topics);
    // const { topicId } = topics[0];

    let page = 1
    let done = false

    let allComments = []

    while (!done) {
      const { total, comments } = await requestTopicComments(440, '1744480967012786259', '/discussions/0', page)
      allComments.push(comments);

      if (total > page * 50) {
        page++
      } else {
        done = true;
      }
    }

    fs.writeFileSync(path.resolve(__dirname, Date.now() + '.json'), JSON.stringify(allComments, null, 4))

    console.log(allComments.length)
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}


main();
