import type { ConfirmedDescriptionTemplates } from '#shared/game-data/live-skills'

export const confirmedDescriptionTemplates: ConfirmedDescriptionTemplates = {
  activeEffect: {
    '1': [
      {
        parameters: ['percent'],
        text: {
          jpn: 'スコアが{percent}%UP',
          eng: 'Score UP {percent}%.',
          ind: 'Skor Naik {percent}%',
          kor: '스코어가 {percent}% UP',
          cht: '分數提升{percent}%',
          chs: '得分提升{percent}%',
        },
      },
    ],
    '5': [
      {
        parameters: ['percent'],
        text: {
          jpn: 'スコアサポート効果{percent}%',
          eng: 'Grants Score Support Effect of {percent}%.',
          ind: 'Efek Score Support meningkat {percent}%',
          kor: '스코어 서포트 효과 {percent}%',
          cht: '分數加成效果{percent}%',
          chs: '得分辅助效果{percent}%',
        },
      },
    ],
    '6': [
      {
        parameters: ['percent'],
        text: {
          jpn: 'スキル発動率が{percent}%UP',
          eng: 'Skill Activation Rate UP {percent}%.',
          ind: 'Peluang Aktivasi Skill Naik {percent}%',
          kor: '스킬 발동률이 {percent}% UP',
          cht: '技能發動機率提升{percent}%',
          chs: '技能发动概率提升{percent}%',
        },
      },
    ],
    '8': [
      {
        parameters: ['amount'],
        text: {
          jpn: 'ライフが{amount}回復',
          eng: 'Restores {amount} LIFE.',
          ind: 'Pemulihan LIFE {amount}',
          kor: '라이프가 {amount} 회복',
          cht: '生命值回復{amount}',
          chs: '生命值恢复{amount}点',
        },
      },
    ],
    '9': [
      {
        parameters: [],
        text: {
          jpn: 'GOOD以上がPERFECTになる',
          eng: 'GOOD or higher becomes PERFECT.',
          ind: 'Diatas GOOD menjadi PERFECT',
          kor: 'GOOD 이상이 PERFECT가 된다',
          cht: 'GOOD以上判定為PERFECT',
          chs: 'GOOD以上变为PERFECT',
        },
      },
    ],
  },
  effect: {
    '4': [
      {
        parameters: ['target', 'percent'],
        text: {
          jpn: '{target}パフォーマンスが{percent}%UP',
          eng: 'Grants Performance UP {percent}% to {target}.',
          ind: 'Performa Naik {percent}% untuk {target}.',
          kor: '{target} 퍼포먼스가 {percent}% UP',
          cht: '{target}表現力提升{percent}%',
          chs: '{target}表现力提升{percent}%',
        },
      },
    ],
    '5': [
      {
        parameters: ['target', 'percent'],
        text: {
          jpn: '{target}テクニックが{percent}%UP',
          eng: 'Grants Technique UP {percent}% to {target}.',
          ind: 'Teknik Naik {percent}% untuk {target}.',
          kor: '{target} 테크닉이 {percent}% UP',
          cht: '{target}技巧提升{percent}%',
          chs: '{target}技巧提升{percent}%',
        },
      },
    ],
    '6': [
      {
        parameters: ['target', 'percent'],
        text: {
          jpn: '{target}センスが{percent}%UP',
          eng: 'Grants Sense UP {percent}% to {target}.',
          ind: 'Sense Naik {percent}% untuk {target}.',
          kor: '{target} 센스가 {percent}% UP',
          cht: '{target}品味提升{percent}%',
          chs: '{target}品位提升{percent}%',
        },
      },
    ],
    '8': [
      {
        parameters: ['target', 'percent'],
        text: {
          jpn: '{target}全パラメータが{percent}%UP',
          eng: 'Grants All Stats UP {percent}% to {target}.',
          ind: 'Semua Stat {target} Naik {percent}%.',
          kor: '{target} 전체 파라미터가 {percent}% UP',
          cht: '{target}全能力提升{percent}%',
          chs: '{target}所有参数提升{percent}%',
        },
      },
    ],
    '10': [
      {
        parameters: ['target', 'percent'],
        text: {
          jpn: '{target}スコアサポート効果{percent}%',
          eng: 'Grants Score Support Effect of {percent}% to {target}.',
          ind: 'Efek Score Support meningkat {percent}% untuk {target}.',
          kor: '{target} 스코어 서포트 효과 {percent}%',
          cht: '{target}分數加成效果{percent}%',
          chs: '{target}得分辅助效果{percent}%',
        },
      },
    ],
  },
  trigger: {
    '1': [
      {
        parameters: ['character'],
        text: {
          jpn: 'リーダーが{character}で',
          eng: 'When {character} is the Leader,',
          ind: 'Jika Leader adalah {character}',
          kor: '리더가 {character}(이)면',
          cht: '隊長為{character}時',
          chs: '领队为{character}时',
        },
      },
    ],
    '2': [
      {
        parameters: ['group'],
        text: {
          jpn: 'リーダーが{group}で',
          eng: 'When {group} is the Leader,',
          ind: 'Jika Leader adalah {group}',
          kor: '리더가 {group}(이)면',
          cht: '隊長為{group}時',
          chs: '领队为{group}时',
        },
      },
    ],
    '4': [
      {
        parameters: ['character'],
        text: {
          jpn: '{character}が歌唱者に含まれる時',
          eng: 'When {character} is included as a singer,',
          ind: 'Ketika {character} disertakan sebagai penyanyi',
          kor: '{character}(이)가 가창자로 포함되었을 때',
          cht: '演唱者含{character}時',
          chs: '歌手中包含{character}时',
        },
      },
    ],
    '7': [
      {
        parameters: ['group', 'threshold'],
        text: {
          jpn: '{group}が{threshold}人以上で',
          eng: 'With {threshold} or more {group} Members,',
          ind: 'Lebih dari {threshold} member {group}',
          kor: '{group}(이)가 {threshold}명 이상이면',
          cht: '若編入{threshold}名以上{group}',
          chs: '队伍中有至少{threshold}名{group}时',
        },
      },
    ],
    '8': [
      {
        parameters: ['attribute', 'threshold'],
        text: {
          jpn: '{attribute}{threshold}人以上で',
          eng: 'With {threshold} or more {attribute} Members,',
          ind: 'Minimal {threshold} member {attribute}',
          kor: '{attribute} {threshold}명 이상이면',
          cht: '若編入{threshold}名以上{attribute}的人物',
          chs: '队伍中有至少{threshold}名{attribute}的角色时',
        },
      },
    ],
    '9': [
      {
        parameters: ['threshold'],
        text: {
          jpn: '{threshold}コンボ以上で',
          eng: 'With a Combo of {threshold} or more,',
          ind: 'Minimal {threshold} kombo,',
          kor: '{threshold}콤보 이상이면',
          cht: '{threshold}Combo以上時',
          chs: '达成{threshold}连击以上',
        },
      },
    ],
    '10': [
      {
        parameters: ['threshold'],
        text: {
          jpn: 'ライフ{threshold}以上で',
          eng: 'When LIFE is {threshold} or higher,',
          ind: 'Dengan LIFE diatas {threshold}',
          kor: '라이프 {threshold} 이상이면',
          cht: '生命值{threshold}以上時',
          chs: '生命值在{threshold}点以上时',
        },
      },
    ],
    '11': [
      {
        parameters: ['threshold'],
        text: {
          jpn: 'ライフ{threshold}以下で',
          eng: 'When LIFE is {threshold} or less,',
          ind: 'Dengan LIFE dibawah {threshold}',
          kor: '라이프 {threshold} 이하면',
          cht: '生命值{threshold}以下時',
          chs: '生命值在{threshold}点以下时',
        },
      },
    ],
    '12': [
      {
        parameters: ['judgement'],
        text: {
          jpn: '判定が{judgement}で',
          eng: 'When you hit a {judgement},',
          ind: 'Dengan hasil {judgement}',
          kor: '판정이 {judgement}(이)면',
          cht: '判定為{judgement}時',
          chs: '判定为{judgement}时',
        },
      },
    ],
  },
  target: {
    '1': [
      {
        parameters: [],
        text: {
          jpn: '自身の',
          eng: 'self',
          ind: 'Diri sendiri',
          kor: '자신의',
          cht: '自己的',
          chs: '自身的',
        },
      },
    ],
    '2': [
      {
        parameters: [],
        text: {
          jpn: '全員の',
          eng: 'all',
          ind: 'Setiap Member',
          kor: '전원의',
          cht: '全體成員的',
          chs: '全体成员中',
        },
      },
    ],
    '4': [
      {
        parameters: ['group', 'count'],
        text: {
          jpn: '{group}{count}人の',
          eng: '{count} {group} Members',
          ind: '{count} orang {group}',
          kor: '{group}{count}명의',
          cht: '{count}名{group}的',
          chs: '令{count}名{group}的',
        },
      },
    ],
    '5': [
      {
        parameters: ['attribute', 'count'],
        text: {
          jpn: '{attribute}{count}人の',
          eng: '{count} {attribute} Members',
          ind: '{count} Member {attribute}',
          kor: '{attribute} {count}명의',
          cht: '{count}名{attribute}的',
          chs: '{count}名{attribute}角色',
        },
      },
    ],
  },
}
