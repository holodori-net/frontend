<script setup lang="ts" generic="T extends string | string[]">
import {
  gameLocaleLanguages,
  isGameLocale,
  resolveLocalizedName,
  siteLocaleLanguages,
  type SiteLocale,
} from '#shared/language'
import {
  groupMembers,
  memberGroupsDataKey,
  type MemberGroup,
} from '#shared/game-data/member-select'
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
    multiple?: boolean
  }>(),
  { multiple: false },
)
const model = defineModel<T>({
  required: true,
  set(value) {
    return Array.isArray(value) ? ([...new Set(value)] as T) : value
  },
})
const route = useRoute()
const { locale, t } = useI18n()
const { data: memberGroups } = useNuxtData<MemberGroup[]>(memberGroupsDataKey)
const gameLocale = computed(() => {
  const value = route.params.gameLocale
  return typeof value === 'string' && isGameLocale(value) ? value : 'jpn'
})

const options = computed(() =>
  props.members.map((member) => {
    const localizedName = member.name
      ? resolveLocalizedName(member.name, gameLocale.value)
      : { text: member.id, lang: gameLocaleLanguages[gameLocale.value] }
    return {
      ...member,
      ...localizedName,
      label: localizedName.text,
      searchNames: member.name ? Object.values(member.name).join(' ') : '',
    }
  }),
)
const groupedOptions = computed(() =>
  groupMembers(options.value, memberGroups.value ?? []).map((group) => {
    const localizedName = group.name
      ? resolveLocalizedName(group.name, gameLocale.value)
      : {
          text: t('charactersOtherGroup'),
          lang: siteLocaleLanguages[locale.value as SiteLocale],
        }
    return { ...group, label: localizedName.text, lang: localizedName.lang }
  }),
)
const selectedOption = (value: unknown) =>
  typeof value === 'string'
    ? options.value.find((option) => option.id === value)
    : undefined
const selectedName = (value: unknown) =>
  selectedOption(value)?.text ?? (typeof value === 'string' ? value : '')
const selectedLanguage = (value: unknown) =>
  selectedOption(value)?.lang ?? gameLocaleLanguages[gameLocale.value]
</script>

<template>
  <MultiSelect
    v-if="multiple"
    v-model="model"
    v-bind="$attrs"
    :options="groupedOptions"
    option-label="label"
    option-value="id"
    option-group-label="label"
    option-group-children="members"
    :placeholder="t('selectMembers')"
    :filter-placeholder="t('searchMembers')"
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
    <template #optiongroup="{ option }">
      <span :lang="option.lang" class="text-base">{{ option.label }}</span>
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
    :options="groupedOptions"
    option-label="label"
    option-value="id"
    option-group-label="label"
    option-group-children="members"
    :placeholder="t('selectMembers')"
    :filter-placeholder="t('searchMembers')"
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
    <template #optiongroup="{ option }">
      <span :lang="option.lang" class="text-base">{{ option.label }}</span>
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
