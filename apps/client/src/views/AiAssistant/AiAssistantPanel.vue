<template>
  <div>
    <div ref="panelEl" v-show="props.visible" class="fixed z-50 w-[28rem] h-[84vh] bg-base-100 shadow-lg flex flex-col panel-card" :style="style">
      <h3 ref="panelTitleEl" class="cursor-move font-bold text-lg leading-10 pl-4 pt-2 flex-none">来点灵感</h3>
      <span class="absolute right-2 top-2">
        <span class="tooltip tooltip-left" data-tip="重置所有对话">
          <button class="btn btn-sm btn-circle btn-ghost" @click="chatStore.clearHistory()"><ArrowPathRoundedSquareIcon class="size-4" /></button>
        </span>
        <span class="tooltip tooltip-left" data-tip="高级设置">
          <button class="btn btn-sm btn-circle btn-ghost" @click="settingDialogVisible = true"><Cog6ToothIcon class="size-4" /></button>
        </span>
        <span class="tooltip tooltip-left" data-tip="关闭窗口">
          <button class="btn btn-sm btn-circle btn-ghost" @click="emit('update:visible', false)"><XMarkIcon class="size-4" /></button>
        </span>
      </span>
      <div ref="conversationListEl" class="m-4 mt-0 p-2 flex-grow overflow-x-hidden overflow-y-auto border-common">
        <div class="alert alert-info text-sm p-3">
          <span>关于 AI 的使用帮助请<a class="link" href="https://paotuan.io/admin/inspiration.html" target="_blank">查看这里</a>。服务器资源有限，请勿滥用。请考虑<a class="link" href="https://afdian.net/a/florastudio" target="_blank">支持我们</a>，帮助维持这个功能的长期运行！</span>
        </div>
        <div v-for="chat in chatStore.history" :key="chat.id" class="chat relative group" :class="chat.role === 'user' ? 'chat-end' : 'chat-start'">
          <div class="chat-bubble" :class="chat.isError ? 'chat-bubble-error' : chat.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-accent'">
            {{ chat.content }}
            <span v-if="chat.role !== 'user'" class="tooltip tooltip-left absolute bottom-0 -right-10 invisible group-hover:visible" data-tip="移除本轮对话">
              <button class="btn btn-circle btn-error btn-sm " @click="chatStore.clearSingle(chat.id)">
                <XMarkIcon class="size-4" />
              </button>
            </span>
          </div>
        </div>
      </div>
      <div class="form-control flex-none w-full p-4 pt-0 dropdown dropdown-hover dropdown-top dropdown-end">
        <div class="join">
          <input v-model="inputArea" type="text" placeholder="说些什么……" class="join-item input input-bordered input-sm flex-grow" @keyup.enter="send" />
          <button tabindex="0" class="join-item btn btn-sm btn-secondary">预设</button>
          <button class="join-item btn btn-sm btn-primary" @click="send">
            <span v-if="chatStore.chatLoading" class="loading"></span>
            发送
          </button>
        </div>
        <!-- input-group 和 dropdown 的组合，很怪，不过先这样吧 -->
        <ul tabindex="0" class="dropdown-content z-10 menu menu-sm p-2 mx-8 shadow bg-base-100 rounded-box w-30">
          <li v-for="item in presets" :key="item.key"><a @click="inputArea = item.content">{{ item.key }}</a></li>
        </ul>
      </div>
    </div>
    <!-- setting dialog -->
    <d-modal v-model:visible="settingDialogVisible" title="高级设置">
      <div class="form-control w-60">
        <label class="cursor-pointer label">
          <span class="label-text">使用共享 Key</span>
          <input v-model="chatStore.useOfficialApi" type="checkbox" class="toggle toggle-primary" />
          <span class="label-text">使用自有 Key</span>
        </label>
      </div>
      <template v-if="chatStore.useOfficialApi">
        <div class="form-control w-full">
          <label class="label"><span class="label-text">OpenAI Key</span></label>
          <input v-model="chatStore.apiKey" type="text" placeholder="sk-xxxxx" class="input input-bordered w-full" />
        </div>
        <div class="form-control w-full">
          <label class="label"><span class="label-text">API 代理地址（可选）</span></label>
          <input v-model="chatStore.apiProxy" type="text" placeholder="https://api.openai.com/v1/chat/completions" class="input input-bordered w-full" />
        </div>
        <div class="flex items-center justify-between mt-2 mb-4">
          <div class="flex items-center gap-4">
            <span class="label-text flex-none pl-1">模型</span>
            <select v-model="chatStore.model" class="select select-bordered select-sm w-full max-w-xs">
              <option>gpt-3.5-turbo</option>
              <option>gpt-4</option>
            </select>
          </div>
        </div>
      </template>
      <div class="form-control">
        <label class="label"><span class="label-text">系统指令（System Prompt）</span></label>
        <textarea v-model="chatStore.systemPrompt" class="textarea textarea-bordered h-24" placeholder="请输入"></textarea>
      </div>
    </d-modal>
  </div>
</template>
<script setup lang="ts">
import { ArrowPathRoundedSquareIcon, Cog6ToothIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import DModal from '../../dui/modal/DModal.vue'
import { useChatStore } from '../../store/chat'
import { ref, watch } from 'vue'
import { useDraggable, useWindowSize } from '@vueuse/core'
import { clamp } from 'lodash'
import { gtagEvent } from '../../utils'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const chatStore = useChatStore()
const panelEl = ref<HTMLElement | null>(null)
const panelTitleEl = ref<HTMLElement | null>(null)
const { width, height } = useWindowSize()
const { x: panelX, y: panelY, style } = useDraggable(panelEl, {
  initialValue: { x: width.value - 434, y: 76 },
  handle: panelTitleEl,
  preventDefault: true,
  onMove: position => {
    position.x = clamp(position.x, 0, width.value - 420)
    position.y = clamp(position.y, 0, height.value - 50)
  }
})

const resetPosition = () => {
  panelX.value = width.value - 434
  panelY.value = 76
}
defineExpose({ resetPosition })

// region 聊天列表自动滚动到最后
const conversationListEl = ref<HTMLElement | null>(null)
watch(() => chatStore.history.length, (value, oldValue) => {
  if (value > oldValue) {
    setTimeout(() => {
      if (conversationListEl.value) {
        conversationListEl.value.scrollTop = conversationListEl.value.scrollHeight
      }
    }, 100)
  }
})

// region 发送逻辑
const inputArea = ref('')
const send = () => {
  if (chatStore.chatLoading) return
  if (!inputArea.value.trim()) return
  chatStore.request(inputArea.value)
  inputArea.value = ''
  gtagEvent('ai/send')
}

// 预设
const presets = [
  { key: '场景生成', content: '请描述一个傍晚时分阴森诡异的树林场景，200字左右' },
  { key: '人物导入', content: '请描述一个名叫阿瑟的神父和一个名叫大卫的战地医生，他们认识的背景故事，300字左右' },
  { key: '总结对话', content: '请总结上述对话的内容，实现减少token的同时，保证对话的质量' },
  { key: '继续', content: 'continue' }
]

// 高级设置
const settingDialogVisible = ref(false)
</script>
<style scoped>
.panel-card {
  border-radius: var(--rounded-box, 1rem);
}

.border-common {
  --tw-border-opacity: 0.2;
  border-width: 1px;
  border-color: oklch(var(--bc) / var(--tw-border-opacity));
  border-radius: var(--rounded-btn, 0.5rem);
}
</style>
