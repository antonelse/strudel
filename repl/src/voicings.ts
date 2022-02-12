import { Pattern as _Pattern, stack, TimeSpan, Hap } from '../../strudel.mjs';
import voicings from 'chord-voicings';
const { dictionaryVoicing, minTopNoteDiff, lefthand } = voicings;

const getVoicing = (chord, lastVoicing, range = ['F3', 'A4']) =>
  dictionaryVoicing({
    chord,
    dictionary: lefthand,
    range,
    picker: minTopNoteDiff,
    lastVoicing,
  });

const Pattern = _Pattern as any;

Pattern.prototype.voicings = function (range = ['F3', 'A4']) {
  let lastVoicing;
  return new Pattern((span) =>
    this.query(span)
      .map((event) => {
        lastVoicing = getVoicing(event.value, lastVoicing, range);
        return stack(...lastVoicing)
          .query(span)
          .map((hap) => new Hap(event.whole, event.part, hap.value));
      })
      .flat()
  );
};
