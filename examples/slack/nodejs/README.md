# [janis](https://www.janis.ai) Slack Bot Botkit Example

This is a simple Slack bot built with Botkit and janis integration example.

### Sign Up With janis

You'll need an API key from janis, as well as a Client Key for each Chatbot.  You can get both of those (free) when you add [janis for Slack](https://slack.com/oauth/authorize?scope=users:read,users:read.email,commands,chat:write:bot,channels:read,channels:write,bot&client_id=23850726983.39760486257) via a conversation with the janis bot. 

### Connecting Your Bot to Slack

To connect a bot to Slack, [get a Bot API token from the Slack integrations page](https://my.slack.com/services/new/bot).

### Installation

```bash
$ npm install
```

### Usage

As early as possible in your application, require and configure dotenv.

```javascript
require('dotenv').config();
```

Create a `.env` file in the root directory of your project. Add
environment-specific variables on new lines in the form of `NAME=VALUE`.
For example:

```
janis_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
janis_CLIENT_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
token=xoxb-11111111111-11111111111111111111111
```
Run the following command to get your bot online:

```bash
$ npm start
```