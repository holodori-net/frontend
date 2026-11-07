<script setup lang="ts" generic="T extends string | string[]">
import {
  gameLocaleLanguages,
  resolveLocalizedName,
  type GameLocale,
} from '#shared/language'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import type { LocalizedNames } from '#shared/game-data/localized-text'

defineOptions({ inheritAttrs: false })

interface MemberOption {
  id: string
  name?: Readonly<LocalizedNames>
  icon?: string | null
}

const props = withDefaults(
  defineProps<{
    members: readonly MemberOption[]
    gameLocale: GameLocale
    multiple?: boolean
  }>(),
  { multiple: false },
)
const model = defineModel<T>({ required: true })

const options = computed(() =>
  props.members.map((member) => {
    const localizedName = member.name
      ? resolveLocalizedName(member.name, props.gameLocale)
      : { text: member.id, lang: gameLocaleLanguages[props.gameLocale] }
    return {
      ...member,
      ...localizedName,
      label: localizedName.text,
      searchNames: member.name ? Object.values(member.name).join(' ') : '',
    }
  }),
)
const selectedOption = (value: unknown) =>
  typeof value === 'string'
    ? options.value.find((option) => option.id === value)
    : undefined
const selectedName = (value: unknown) =>
  selectedOption(value)?.text ?? (typeof value === 'string' ? value : '')
const selectedLanguage = (value: unknown) =>
  selectedOption(value)?.lang ?? gameLocaleLanguages[props.gameLocale]
</script>

<template>
  <MultiSelect
    v-if="multiple"
    v-model="model"
    v-bind="$attrs"
    :options="options"
    option-label="label"
    option-value="id"
    :filter-fields="['searchNames', 'id']"
    filter
    display="chip"
  >
    <template #option="{ option }">
      <MemberSelectLabel
        :icon="option.icon ?? null"
        :text="option.text"
        :lang="option.lang"
      />
    </template>
    <template #chip="{ value, removeCallback }">
      <Chip
        class="p-multiselect-chip"
        :label="selectedOption(value)?.text ?? value"
        :lang="selectedOption(value)?.lang"
        removable
        @remove="removeCallback($event, value)"
      />
    </template>
  </MultiSelect>
  <Select
    v-else
    v-model="model"
    v-bind="$attrs"
    :options="options"
    option-label="label"
    option-value="id"
    :filter-fields="['searchNames', 'id']"
    filter
  >
    <template #option="{ option }">
      <MemberSelectLabel
        :icon="option.icon ?? null"
        :text="option.text"
        :lang="option.lang"
      />
    </template>
    <template #value="{ value, placeholder }">
      <MemberSelectLabel
        v-if="value && selectedOption(value)"
        :icon="selectedOption(value)?.icon ?? null"
        :text="selectedName(value)"
        :lang="selectedLanguage(value)"
      />
      <span v-else>{{ placeholder }}</span>
    </template>
  </Select>
</template>
