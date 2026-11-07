<script setup lang="ts">
import { LayoutList, RotateCcw, SquareText } from '@lucide/vue'
import {
  getCardListFieldGroups,
  CARD_BASIC_INFORMATION_FIELDS,
  CARD_SKILL_FIELDS,
  CARD_LIST_FIELDS,
  type CardListField,
  type CardListFieldGroup,
  type CardSkillField,
  type CardSkillLevelSelections,
  type CardListLayout,
} from '#shared/game-data/cards/display'

const props = defineProps<{
  fields: readonly CardListField[]
  skillLevels: Readonly<Record<CardSkillField, readonly number[]>>
  availableSkillLevels: CardSkillLevelSelections
}>()
const layout = defineModel<CardListLayout>('layout', { required: true })
const emit = defineEmits<{
  reset: []
  toggleField: [field: CardListField, selected: boolean]
  toggleSkillLevel: [field: CardSkillField, level: number, selected: boolean]
}>()
const { t } = useI18n()
const layoutOptions = computed<{ value: CardListLayout; label: string }[]>(() =>
  (['full', 'vertical'] as const).map((value) => ({
    value,
    label: t(`cardList.layout.${value}`),
  })),
)
const fieldOptions = computed(() =>
  CARD_LIST_FIELDS.map((field) => ({
    value: field,
    label: t(`cardList.field.${field}`),
    levels: isSkillField(field) ? props.availableSkillLevels[field] : [],
  })),
)
const basicFieldOptions = computed(() =>
  fieldOptions.value.filter((option) =>
    (CARD_BASIC_INFORMATION_FIELDS as readonly string[]).includes(option.value),
  ),
)
const selectedGroups = computed(() => getCardListFieldGroups(props.fields))
function isSkillField(field: CardListField): field is CardSkillField {
  return CARD_SKILL_FIELDS.includes(field as CardSkillField)
}
function selectedOrder(group: CardListFieldGroup['key']) {
  const index = selectedGroups.value.findIndex((item) => item.key === group)
  return index < 0 ? null : index + 1
}
</script>

<template>
  <AccordionPanel value="display">
    <div class="flex items-stretch">
      <AccordionHeader class="min-w-0 flex-1">
        <span class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
          <span>{{ t('cardList.displaySettings') }}</span>
          <span class="text-sm font-normal text-muted-color">
            {{ t(`cardList.layout.${layout}`) }} ·
            {{
              t('cardList.fieldsCount', {
                count: selectedGroups.length,
              })
            }}
          </span>
        </span>
      </AccordionHeader>
      <Button
        id="card-display-reset"
        type="button"
        severity="secondary"
        text
        class="!h-auto min-h-11 !w-14 shrink-0 rounded-none !p-0"
        :aria-label="t('cardList.resetDisplay')"
        :title="t('cardList.resetDisplay')"
        @click="emit('reset')"
      >
        <RotateCcw
          aria-hidden="true"
          :size="20"
          :stroke-width="2"
          color="currentColor"
        />
      </Button>
    </div>
    <AccordionContent>
      <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
        <fieldset class="w-full border-0 p-0 sm:w-52">
          <legend class="mb-1.5 text-sm font-medium">
            {{ t('cardList.layoutLabel') }}
          </legend>
          <div class="flex gap-2">
            <Button
              v-for="option in layoutOptions"
              :key="option.value"
              type="button"
              class="!size-11 !p-0"
              :severity="layout === option.value ? 'primary' : 'secondary'"
              :outlined="layout !== option.value"
              :aria-label="option.label"
              :aria-pressed="layout === option.value"
              :title="option.label"
              @click="layout = option.value"
            >
              <SquareText
                v-if="option.value === 'full'"
                aria-hidden="true"
                :size="20"
                :stroke-width="2"
                color="currentColor"
              />
              <LayoutList
                v-else
                aria-hidden="true"
                :size="20"
                :stroke-width="2"
                color="currentColor"
              />
            </Button>
          </div>
        </fieldset>
        <fieldset class="min-w-0 flex-1">
          <legend class="mb-1.5 text-sm font-medium">
            {{ t('cardList.fieldsLabel') }}
          </legend>
          <p class="mb-2 text-xs text-muted-color">
            {{ t('cardList.fieldOrderHelp') }}
          </p>
          <div class="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-2">
            <template v-for="option in fieldOptions" :key="option.value">
              <InputGroup
                v-if="option.value === 'name'"
                role="group"
                aria-labelledby="card-field-label-basic"
                class="w-auto min-w-0 max-w-full flex-wrap items-stretch"
                style="
                  --p-inputgroup-addon-border-radius: 0.25rem;
                  --p-inputgroup-addon-background: var(
                    --p-button-secondary-background
                  );
                  --p-inputgroup-addon-border-color: var(
                    --p-button-outlined-secondary-border-color
                  );
                "
              >
                <InputGroupAddon
                  class="h-auto min-h-8 min-w-0 max-w-full flex-none flex-wrap gap-1.5 px-2 py-1 text-sm leading-5 font-medium select-none"
                >
                  <Badge
                    :value="selectedOrder('basic') ?? '−'"
                    severity="contrast"
                    aria-hidden="true"
                    class="size-5 min-w-5 shrink-0 rounded-full p-0 leading-5"
                  />
                  <span
                    id="card-field-label-basic"
                    class="min-w-0 text-color break-words"
                  >
                    {{ t('cardList.basicInformation') }}
                  </span>
                </InputGroupAddon>
                <Button
                  v-for="basicOption in basicFieldOptions"
                  :id="`card-field-${basicOption.value}`"
                  :key="basicOption.value"
                  :aria-label="basicOption.label"
                  :aria-pressed="fields.includes(basicOption.value)"
                  :outlined="!fields.includes(basicOption.value)"
                  :severity="
                    fields.includes(basicOption.value) ? 'primary' : 'secondary'
                  "
                  size="small"
                  class="h-auto min-h-8 min-w-0 max-w-full flex-none whitespace-normal px-2 py-1 text-sm leading-5 font-medium"
                  :class="{
                    'text-color': !fields.includes(basicOption.value),
                  }"
                  @click="
                    emit(
                      'toggleField',
                      basicOption.value,
                      !fields.includes(basicOption.value),
                    )
                  "
                >
                  <span class="min-w-0 whitespace-normal break-words">
                    {{ basicOption.label }}
                  </span>
                </Button>
              </InputGroup>

              <InputGroup
                v-else-if="isSkillField(option.value)"
                role="group"
                :aria-labelledby="`card-field-label-${option.value}`"
                class="w-auto min-w-0 max-w-full flex-none"
                style="
                  --p-inputgroup-addon-border-radius: 0.25rem;
                  --p-inputgroup-addon-background: var(
                    --p-button-secondary-background
                  );
                  --p-inputgroup-addon-border-color: var(
                    --p-button-outlined-secondary-border-color
                  );
                "
              >
                <InputGroupAddon
                  class="h-8 min-w-0 gap-1.5 px-2 py-1 text-sm leading-5 font-medium select-none"
                >
                  <Badge
                    :value="selectedOrder(option.value) ?? '−'"
                    severity="contrast"
                    aria-hidden="true"
                    class="size-5 min-w-5 shrink-0 rounded-full p-0 leading-5"
                  />
                  <span
                    :id="`card-field-label-${option.value}`"
                    class="min-w-0 text-color"
                  >
                    {{ option.label }}
                  </span>
                </InputGroupAddon>
                <Button
                  v-for="level in option.levels"
                  :id="`card-field-${option.value}-level-${level}`"
                  :key="level"
                  :aria-label="
                    t('cardList.skillLevelOption', {
                      skill: option.label,
                      level,
                    })
                  "
                  :aria-pressed="
                    skillLevels[option.value as CardSkillField].includes(level)
                  "
                  :outlined="
                    !skillLevels[option.value as CardSkillField].includes(level)
                  "
                  :severity="
                    skillLevels[option.value as CardSkillField].includes(level)
                      ? 'primary'
                      : 'secondary'
                  "
                  size="small"
                  class="h-8 shrink-0 px-2 py-1 text-sm leading-5 font-medium"
                  :class="{
                    'text-color':
                      !skillLevels[option.value as CardSkillField].includes(
                        level,
                      ),
                  }"
                  @click="
                    emit(
                      'toggleSkillLevel',
                      option.value as CardSkillField,
                      level,
                      !skillLevels[option.value as CardSkillField].includes(
                        level,
                      ),
                    )
                  "
                >
                  <span>
                    {{ t('cardList.skillLevel', { level }) }}
                  </span>
                </Button>
              </InputGroup>
              <Button
                v-else-if="option.value === 'costume'"
                :id="`card-field-${option.value}`"
                :aria-label="option.label"
                :aria-pressed="fields.includes(option.value)"
                :outlined="!fields.includes(option.value)"
                :severity="
                  fields.includes(option.value) ? 'primary' : 'secondary'
                "
                size="small"
                class="h-8 max-w-full gap-1.5 rounded px-2 py-1 text-sm leading-5 font-medium"
                :class="{
                  'text-color': !fields.includes(option.value),
                }"
                @click="
                  emit(
                    'toggleField',
                    option.value,
                    !fields.includes(option.value),
                  )
                "
              >
                <Badge
                  :value="selectedOrder(option.value) ?? '−'"
                  severity="contrast"
                  aria-hidden="true"
                  class="size-5 min-w-5 shrink-0 rounded-full p-0 leading-5"
                />
                <span>{{ option.label }}</span>
              </Button>
            </template>
          </div>
        </fieldset>
      </div>
    </AccordionContent>
  </AccordionPanel>
</template>
