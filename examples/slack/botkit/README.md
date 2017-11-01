# [Janis](https://www.janis.ai) Slack Bot Botkit Example

This is a simple Messenger Chatbot built with [Botkit](https://github.com/howdyai/botkit) and [Janis](https://www.janis.ai). 

### Sign Up With janis

You'll need an API key from Janis and a Client Key for your Chatbot.  You can get both of those (free) when you add [Janis for Slack](https://www.janis.ai) and start a conversation with Janis in Slack.


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
JANIS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JANIS_CLIENT_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
token=xoxb-11111111111-11111111111111111111111
```
Run the following command to get your bot online:

```bash
$ npm start
```