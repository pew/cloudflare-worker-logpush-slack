# Logpush to Slack Endpoint

Send all your Cloudflare Logpush logs to a Slack channel using a Cloudflare Worker and the [HTTP destination](https://developers.cloudflare.com/logs/get-started/enable-destinations/http/) feature.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/pew/cloudflare-worker-logpush-slack/)

(If you're using the Deploy button above, manually add the secret with the variable name `SLACK_BOT_TOKEN` through the dashboard.)

<img width="350" alt="image" src="https://github.com/user-attachments/assets/18153c83-de47-4c26-9d00-774df3bf5609" />

## Create the Worker

- Clone this repo
- Deploy the Worker

```shell
npm run deploy
```

- Note down the returned URL to create the actual Logpush job
- Create a secret for your Slack bot token (requires `chat:write` permission for your bot)

```shell
npx wrangler secret put SLACK_BOT_TOKEN
```

## Usage

- Add the Worker endpoint as an HTTP destination in Cloudflare Logpush.
- Specify the Slack channel name as a query string parameter (without the `#`), for example:

```
https://foobar.workers.dev/?channel=logs
```

This will send all incoming Logpush entries to the `#logs` channel in your Slack workspace.

## Notes

- The Worker expects newline-delimited JSON log entries (the default for Logpush HTTP destinations).
- The Slack bot token must have permission to post to the specified channel.
