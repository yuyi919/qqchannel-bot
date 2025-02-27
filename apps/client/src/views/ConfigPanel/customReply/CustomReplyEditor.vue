<template>
  <div v-if="processor" class="collapse" :class="{ 'collapse-open': isOpen, 'collapse-close': !isOpen }">
    <div class="collapse-title text-md font-medium flex items-center gap-2 cursor-pointer" @click="isOpen = !isOpen">
      <Bars3Icon class="size-4 cursor-move flex-none sortable-handle" @click.stop/>
      <input v-model="item.enabled" type="checkbox" class="checkbox checkbox-sm" @click.stop />
      <span class="inline-flex items-center gap-1 group">
        {{ processor.name }}
        <div v-if="fromPlugin" class="tooltip tooltip-right" :data-tip="`来自插件：${fromPlugin}`">
          <Squares2X2Icon class="size-4 flex-none" />
        </div>
        <button v-else class="btn btn-circle btn-ghost btn-xs invisible group-hover:visible" @click.stop="editSelf">
          <PencilSquareIcon class="size-4 flex-none" />
        </button>
      </span>
      <span v-if="!fromPlugin" class="flex-grow text-right">
        <button class="btn btn-circle btn-outline btn-xs" @click.stop="deleteSelf">
          <svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </span>
    </div>
    <div class="collapse-content">
      <div class="pl-6">
        <div>
          <div v-for="(line, i) in (processor.description || '作者什么说明都没有留下').split('\n')" :key="i">{{ line }}</div>
        </div>
        <template v-if="!fromPlugin">
          <div class="py-2 flex items-center">
            当用户的指令
            <d-native-select v-model="processorLocal.trigger" :options="matchOptions" select-class="select-bordered select-sm" class="w-32 ml-2" placeholder="选择匹配方式" />
            <input v-model="processorLocal.command" type="text" placeholder="请输入匹配词" class="input input-bordered input-sm w-60 mx-2" />
            时，回复：
          </div>
          <div v-for="(item, i) in processorLocal.items" :key="i" class="flex items-center gap-1 mb-2">
            <label class="input input-bordered input-sm flex items-center gap-2">
              <span class="flex-none">权重</span>
              <d-number-input v-model="item.weight" class="w-12" />
            </label>
            <textarea v-model="item.reply as string" class="textarea textarea-bordered w-full custom-reply" placeholder="请输入回复内容" />
            <button class="btn btn-circle btn-ghost btn-xs ml-2" :class="{ invisible: (processorLocal.items || []).length <= 1 }" @click="deleteReplyItem(i)">
              <XMarkIcon class="size-4" />
            </button>
          </div>
          <button class="btn btn-xs btn-ghost" @click="newReplyItem">+ 新增一行</button>
        </template>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { ICustomReplyConfig } from '@paotuan/config'
import { computed, ref, toRefs } from 'vue'
import { Bars3Icon, XMarkIcon, PencilSquareIcon, Squares2X2Icon } from '@heroicons/vue/24/outline'
import { useConfigStore } from '../../../store/config'
import DNativeSelect from '../../../dui/select/DNativeSelect.vue'
import DNumberInput from '../../../dui/input/DNumberInput.vue'
import { IPluginItemConfigForDisplay, usePluginStore } from '../../../store/plugin'

interface Props { item: { id: string, enabled: boolean }, defaultOpen: boolean }
interface Emits {
  (e: 'delete', value: string): void
  (e: 'edit', value: { id: string, name: string, desc: string }): void // full id
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { item } = toRefs(props)

// 根据 id 获取自定义回复配置的具体内容
const configStore = useConfigStore()
const pluginStore = usePluginStore()
const processor = computed(() => configStore.getCustomReplyProcessor(item.value.id) || pluginStore.getPluginCustomReplyProcessor(item.value.id))
const fromPlugin = computed(() => (processor.value as unknown as IPluginItemConfigForDisplay).fromPlugin) // 如果是插件，则取插件名
const processorLocal = computed(() => processor.value as ICustomReplyConfig) // 给模板的 ts 推导使用

// 面板展开状态
const isOpen = ref(props.defaultOpen)

// 删除自己
const deleteSelf = () => emit('delete', item.value.id)

// 编辑标题描述
const editSelf = () => emit('edit', { id: item.value.id, name: processor.value.name, desc: processor.value.description || '' })

// 删除一条回复条目
const deleteReplyItem = (index: number) => {
  const items = processor.value.items
  if (!items) return // 理论不可能
  items.splice(index, 1)
}

// 新增一条回复条目
const newReplyItem = () => {
  const items = processor.value.items
  if (!items) return // 理论不可能
  items.push({ weight: 1, reply: '' })
}

// 匹配方式
type MatchOptions = { label: string, value: ICustomReplyConfig['trigger'] }
const matchOptions: /* Object.freeze */ MatchOptions[] = [
  { label: '精确匹配', value: 'exact' },
  { label: '开头是', value: 'startWith' },
  { label: '包含', value: 'include' },
  { label: '正则匹配', value: 'regex' }
]
</script>
<style scoped>
.collapse-title {
  padding-right: 1rem;
}

.textarea {
  padding: 0 0.75rem;
  min-height: 2rem;
  height: 2rem;
}
</style>
