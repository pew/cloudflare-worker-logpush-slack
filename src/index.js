import { inflate } from 'pako'

const formatSlackMessage = async (log) => {
  // Build a string with all non-empty key/value pairs
  const lines = Object.entries(log)
    .filter(([_, value]) => {
      // Remove empty, null, or undefined values
      if (value === '' || value == null) return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    })
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        value = value.join(', ')
      } else if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value)
      }
      return `*${key}*: ${value}`
    })

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Cloudflare Logpush Entry',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: lines.join('\n') || '_No non-empty fields to display._',
        },
      },
    ],
  }
}

const sendToSlack = async (channel, message, botToken) => {
  const slackUrl = 'https://slack.com/api/chat.postMessage'
  const body = {
    channel,
    ...message,
  }
  const resp = await fetch(slackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify(body),
  })
  return resp
}

const transformLogs = async (obj) => {
  const encoding = obj.contentEncoding || undefined
  let payload = obj.payload
  let logs = []

  if (encoding === 'gzip') {
    payload = await payload.arrayBuffer()
    const data = inflate(payload)
    const logdata = new Uint16Array(data).reduce((data, byte) => data + String.fromCharCode(byte), '')
    logs = logdata
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return line
        }
      })
  } else {
    if (obj.contentType?.includes('application/json')) {
      const text = await payload.text()
      logs = text
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return line
          }
        })
    } else if (obj.contentType?.includes('application/text')) {
      const text = await payload.text()
      logs = text.split('\n').filter(Boolean)
    }
  }
  return logs
}

export default {
  async fetch(request, env) {
    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel')
    if (!channel) {
      return new Response(JSON.stringify({ success: false, message: 'Missing Slack channel in query string' }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    const botToken = env.SLACK_BOT_TOKEN
    if (!botToken) {
      return new Response(JSON.stringify({ success: false, message: 'Missing Slack bot token' }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    const contentEncoding = request.headers.get('content-encoding')
    const contentType = request.headers.get('content-type')
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'please use POST requests' }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    const logs = await transformLogs({ payload: request, contentEncoding, contentType })
    let allOk = true
    for (const log of logs) {
      const message = await formatSlackMessage(log)
      const resp = await sendToSlack(channel, message, botToken)
      if (!resp.ok) allOk = false
    }
    return new Response(JSON.stringify({ success: allOk }), {
      headers: { 'content-type': 'application/json' },
    })
  },
}
