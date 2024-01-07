import { persistentMap, persistentAtom } from '@nanostores/persistent';
import { useStore } from '@nanostores/react';
import { register } from '@strudel.cycles/core';
import { defaultAudioDeviceName } from './repl/panel/AudioDeviceSelector';
import { logger } from '@strudel.cycles/core';

export const defaultSettings = {
  activeFooter: 'intro',
  keybindings: 'codemirror',
  isLineNumbersDisplayed: true,
  isActiveLineHighlighted: true,
  isAutoCompletionEnabled: false,
  isTooltipEnabled: false,
  isFlashEnabled: true,
  isLineWrappingEnabled: false,
  isPatternHighlightingEnabled: true,
  theme: 'strudelTheme',
  fontFamily: 'monospace',
  fontSize: 18,
  latestCode: '',
  isZen: false,
  soundsFilter: 'all',
  panelPosition: 'right',
  userPatterns: '{}',
  audioDeviceName: defaultAudioDeviceName,
};

export const settingsMap = persistentMap('strudel-settings', defaultSettings);

//pattern that the use is currently viewing in the window
const $viewingPattern = persistentAtom('viewingPattern', '', { listen: false });
export function setViewingPattern(key) {
  $viewingPattern.set(key);
}
export function getViewingPattern() {
  return $viewingPattern.get();
}

export function useViewingPattern() {
  return useStore($viewingPattern);
}
// active pattern is separate, because it shouldn't sync state across tabs
// reason: https://github.com/tidalcycles/strudel/issues/857
const $activePattern = persistentAtom('activePattern', '', { listen: false });
export function setActivePattern(key) {
  $activePattern.set(key);
}
export function getActivePattern() {
  return $activePattern.get();
}
export function useActivePattern() {
  return useStore($activePattern);
}
export function initUserCode(code) {
  const userPatterns = getUserPatterns();
  const match = Object.entries(userPatterns).find(([_, pat]) => pat.code === code);
  setActivePattern(match?.[0] || '');
}

export function useSettings() {
  const state = useStore(settingsMap);
  return {
    ...state,
    isZen: [true, 'true'].includes(state.isZen) ? true : false,
    isLineNumbersDisplayed: [true, 'true'].includes(state.isLineNumbersDisplayed) ? true : false,
    isActiveLineHighlighted: [true, 'true'].includes(state.isActiveLineHighlighted) ? true : false,
    isAutoCompletionEnabled: [true, 'true'].includes(state.isAutoCompletionEnabled) ? true : false,
    isPatternHighlightingEnabled: [true, 'true'].includes(state.isPatternHighlightingEnabled) ? true : false,
    isTooltipEnabled: [true, 'true'].includes(state.isTooltipEnabled) ? true : false,
    isLineWrappingEnabled: [true, 'true'].includes(state.isLineWrappingEnabled) ? true : false,
    isFlashEnabled: [true, 'true'].includes(state.isFlashEnabled) ? true : false,
    fontSize: Number(state.fontSize),
    panelPosition: state.activeFooter !== '' ? state.panelPosition : 'bottom', // <-- keep this 'bottom' where it is!
    userPatterns: JSON.parse(state.userPatterns),
  };
}

export const setActiveFooter = (tab) => settingsMap.setKey('activeFooter', tab);

export const setLatestCode = (code) => settingsMap.setKey('latestCode', code);
export const setIsZen = (active) => settingsMap.setKey('isZen', !!active);

const patternSetting = (key) =>
  register(key, (value, pat) =>
    pat.onTrigger(() => {
      value = Array.isArray(value) ? value.join(' ') : value;
      if (value !== settingsMap.get()[key]) {
        settingsMap.setKey(key, value);
      }
      return pat;
    }, false),
  );

export const theme = patternSetting('theme');
export const fontFamily = patternSetting('fontFamily');
export const fontSize = patternSetting('fontSize');

export const settingPatterns = { theme, fontFamily, fontSize };

export function getUserPatterns() {
  return JSON.parse(settingsMap.get().userPatterns);
}
function getSetting(key) {
  return settingsMap.get()[key];
}

export function setUserPatterns(obj) {
  settingsMap.setKey('userPatterns', JSON.stringify(obj));
}

export function addUserPattern(name, config) {
  if (typeof config !== 'object') {
    throw new Error('addUserPattern expected object as second param');
  }
  if (!config.code) {
    throw new Error('addUserPattern expected code as property of second param');
  }
  const userPatterns = getUserPatterns();
  setUserPatterns({ ...userPatterns, [name]: config });
}

export function createNewUserPattern() {
  const userPatterns = getUserPatterns();
  const date = new Date().toISOString().split('T')[0];
  const todays = Object.entries(userPatterns).filter(([name]) => name.startsWith(date));
  const num = String(todays.length + 1).padStart(3, '0');
  const pattern = date + '_' + num;
  const code = 's("hh")';
  return { pattern, code };
}

export function clearUserPatterns() {
  if (!confirm(`This will delete all your patterns. Are you really sure?`)) {
    return;
  }
  setUserPatterns({});
}

export function getNextCloneName(key) {
  const userPatterns = getUserPatterns();
  const clones = Object.entries(userPatterns).filter(([name]) => name.startsWith(key));
  const num = String(clones.length + 1).padStart(3, '0');
  return key + '_' + num;
}

export function getUserPattern(key) {
  const userPatterns = getUserPatterns();
  return userPatterns[key];
}

export function renamePattern(pattern) {
  let userPatterns = getUserPatterns();
  if (!userPatterns[pattern]) {
    alert('Cannot rename examples');
    return;
  }
  const newName = prompt('Enter new name', pattern);
  if (newName === null) {
    // canceled
    return;
  }
  if (userPatterns[newName]) {
    alert('Name already taken!');
    return;
  }
  userPatterns[newName] = userPatterns[pattern]; // copy code
  delete userPatterns[pattern];
  setUserPatterns({ ...userPatterns });
  setViewingPattern(newName);
}

export function updateUserCode(pattern, code) {
  const userPatterns = getUserPatterns();
  setUserPatterns({ ...userPatterns, [pattern]: { code } });
}

export function deletePattern(pattern) {
  if (!pattern) {
    console.warn('cannot delete: no pattern selected');
    return;
  }
  const userPatterns = getUserPatterns();
  if (!userPatterns[pattern]) {
    alert('Cannot delete examples');
    return;
  }
  if (!confirm(`Really delete the selected pattern "${pattern}"?`)) {
    return;
  }
  // const updatedPatterns = Object.fromEntries(Object.entries(userPatterns).filter(([key]) => key !== pattern));
  let patternsArray = Object.entries(userPatterns).sort((a, b) => a[0].localeCompare(b[0]));
  const deleteIndex = patternsArray.findIndex(([key]) => key === pattern);
  patternsArray.splice(deleteIndex, 1);
  const updatedPatterns = Object.fromEntries(patternsArray);

  setUserPatterns(updatedPatterns);

  //create new pattern if no other patterns
  if (!patternsArray.length) {
    return createNewUserPattern();
  }
  // // or default to active pattern
  // const activePatternID = getActivePattern();
  // const activePatternData = updatedPatterns[activePatternID];
  // if (activePatternData?.code != null) {
  //   return { pattern: activePatternID, code: activePatternData.code };
  // }
  // or find pattern at next index

  const next = patternsArray[deleteIndex];
  if (next != null) {
    const [pat, data] = next;
    return { pattern: pat, code: data.code };
  }
  // or find pattern at previous index
  const previous = patternsArray[deleteIndex - 1];
  const [pat, data] = previous;
  return { patttern: pat, code: data.code };
}

export function createDuplicatePattern(pattern) {
  let latestCode = getSetting('latestCode');
  if (!pattern) {
    console.warn('cannot duplicate: no pattern selected');
    return;
  }
  const newPattern = getNextCloneName(pattern);
  return { pattern: newPattern, code: latestCode };
}

export async function importPatterns(fileList) {
  const files = Array.from(fileList);
  await Promise.all(
    files.map(async (file, i) => {
      const content = await file.text();
      if (file.type === 'application/json') {
        const userPatterns = getUserPatterns() || {};
        setUserPatterns({ ...userPatterns, ...JSON.parse(content) });
      } else if (file.type === 'text/plain') {
        const name = file.name.replace(/\.[^/.]+$/, '');
        addUserPattern(name, { code: content });
      }
    }),
  );
  logger(`import done!`);
}

export async function exportPatterns() {
  const userPatterns = getUserPatterns() || {};
  const blob = new Blob([JSON.stringify(userPatterns)], { type: 'application/json' });
  const downloadLink = document.createElement('a');
  downloadLink.href = window.URL.createObjectURL(blob);
  const date = new Date().toISOString().split('T')[0];
  downloadLink.download = `strudel_patterns_${date}.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
