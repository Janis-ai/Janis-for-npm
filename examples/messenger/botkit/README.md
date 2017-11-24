# [Janis](https://www.janis.ai) Messenger Bot Botkit Example

This is a simple Messenger Chatbot with Janis integrated, built with botkit. This integration example assumes you are coding and hosting your own Chatbot.

If you want to experiment with a hosted Chatbot example, you can remix our [Glitch project](https://glitch.com/edit/#!/janis-botkit). 

### Facebook Page

If you haven't already done so, create a [Facebook Page](https://www.facebook.com/pages/create) that your bot will be asscociated with.

### Sign Up With Janis

You'll need an API Key from Janis and a Client Key for your Chatbot.  You can get both of those (free) when you add [Janis for Slack](https://www.janis.ai) and start a conversation with Janis in Slack. 

Add the following to your environment variables, where <JANIS_API_KEY> is the API Key and <JANIS_CLIENT_KEY> is the Client Key:
```
JANIS_API_KEY=<JANIS_API_KEY> 
JANIS_CLIENT_KEY=<JANIS_CLIENT_KEY> 
```
### Authorize Janis

Janis will also generate a link for you that enables you to authorize Janis to subscribe to your Facebook page. The link will be in this format: *https://janis.ai/fb?client_key=<JANIS_CLIENT_KEY>*

### Facebook App

If you haven't already done so, you'll need to setup a [Facebook App](https://developers.facebook.com/apps/).

If you're setting up an App for the first time, this [quickstart guide](https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start#getting_started)  should help.

Add the Messenger environmental variables. You'll need your Page Access Token and your Validation Token that you use to create your webhook:
```
MESSENGER_PAGE_ACCESS_TOKEN=<MESSENGER_PAGE_ACCESS_TOKEN>
MESSENGER_VALIDATION_TOKEN=<MESSENGER_VALIDATION_TOKEN>
```

**NOTE**: You will need to have your app up and running (with all environmental variables added) at a live URL before being able to register your webhook. Your webhook callback URL is the URL of your app. Ensure the following events are selected: **messages**, **messaging_postbacks**, **message_echoes**, **standby**, **messaging_handovers**. 

### Set App Roles

Once you have completed the steps above and completed the Janis installation, go to the Facebook page where you added your bot with Janis integrated. Click "Settings" for the page, than select Messenger Platform. 

Under **Response Method**, ensure the following radio button is selected:

*Responses are partially automated, with some support by people*


Under **Subscribed Apps**, set your app to be the "Primary Receiver". Set Janis as the "Secondary Receiver". For more information about app roles, see: [Facebook App Roles](https://developers.facebook.com/docs/messenger-platform/handover-protocol#app_roles).

### Janis Installation

```bash
$ npm install
```

### Usage

Create a `.env` file in the root directory of your project. Add
environment-specific variables on new lines in the form of `NAME=VALUE`.
For example:

```
JANIS_API_KEY=<JANIS_API_KEY>
JANIS_CLIENT_KEY=<JANIS_CLIENT_KEY>
MESSENGER_PAGE_ACCESS_TOKEN=<MESSENGER_PAGE_ACCESS_TOKEN>
MESSENGER_VALIDATION_TOKEN=<MESSENGER_VALIDATION_TOKEN>
```
Run the following command to get your bot online:

```bash
$ npm start
```