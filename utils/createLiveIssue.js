const axios = require('axios');

const JIRA_BASE_URL = 'https://uppply.atlassian.net';
const JIRA_EMAIL = '';
const JIRA_API_TOKEN = '';
const PROJECT_KEY = 'LIVE';

async function createJiraIssue(meta) {
  try {
    const response = await axios.post(
      `${JIRA_BASE_URL}/rest/api/3/issue`,
      {
        fields: {
          project: {
            key: PROJECT_KEY,
          },
          summary: `${meta.title}`,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                    {
                        type: 'text',
                        text: `${meta.desc}`,
                    },
                ],
              },
            ],
          },
          issuetype: {
            name: 'Task',
          },
        },
      },
      {
        auth: {
          username: JIRA_EMAIL,
          password: JIRA_API_TOKEN,
        },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Issue created:', response.data.key);
  } catch (error) {
    console.error('❌ Error creating Jira issue:', error.response?.data || error.message);
  }
}

export default createJiraIssue();
