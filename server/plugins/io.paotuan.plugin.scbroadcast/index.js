/* eslint-env node */

module.exports = ({ sendMessageToChannel, getPreference, render }) => {
  return {
    id: 'io.paotuan.plugin.scbroadcast',
    name: '理智损失播报',
    description: '当理智损失 5 点或更多时，进行一次播报',
    version: 1,
    preference: [
      {
        key: 'text',
        label: '提示语',
        defaultValue: '{{人物卡名}} 损失了等于或高于5点理智，即将陷入临时性/总结性疯狂！'
      },
    ],
    hook: {
      onCardEntryChange: [
        {
          id: 'x',
          name: '理智损失播报',
          handler: ({ event, context }) => {
            if (event.card.type !== 'coc') return
            if (event.key !== 'SAN') return
            if (typeof event.value !== 'number') return
            if (typeof event.oldValue !== 'number') return
            const loss = event.oldValue - event.value
            if (loss >= 5) {
              const env = {
                ...context,
                nick: context.username,
                用户名: context.username,
                人物卡名: event.card.name,
                at用户: `<@!${context.userId}>`
              } // 兼容处理
              setTimeout(() => {
                const text = getPreference(context).text
                sendMessageToChannel(env, render(text, env))
              }, 100)
            }
          }
        }
      ]
    }
  }
}
