/*
 * Spell checking system file
 * IMPORTS:
 *  - nspell (CJS)
 *  - dictionary-en / dictionary-ru (ESM, грузятся через import())
 * EXPORTS:
 *  - initSpellChecker
 *  - getCorrectionVariants
 */

const nspell = require('nspell');

let spellers = [];
let isInitialized = false;

/*
 * Загрузка словаря: приводит ESM/CJS/callback-формы к единому виду { aff, dic }.
 */
async function loadDictionary(mod) {
    // ESM-модуль: import() возвращает { default: ... }
    let dict = mod?.default ?? mod;

    // Функция-callback
    if (typeof dict === 'function') {
        dict = await new Promise((resolve, reject) => {
            dict((err, result) => (err ? reject(err) : resolve(result)));
        });
    }

    return dict;
}

/*
 * Spell checker initialization function
 * PARAMETERS: None.
 * RETURNS: Promise<void>.
 */
async function initSpellChecker() {
    if (isInitialized) return;

    try {
        // ← динамический import() вместо require()
        const [enMod, ruMod] = await Promise.all([
            import('dictionary-en'),
            import('dictionary-ru'),
        ]);

        const [en, ru] = await Promise.all([
            loadDictionary(enMod),
            loadDictionary(ruMod),
        ]);

        spellers = [nspell(en), nspell(ru)];
        isInitialized = true;
        console.log('Dictionaries loaded (en, ru)');
    } catch (err) {
        console.log('Error loading dictionaries', err);
        throw err;
    }
}

/* ... остальные функции без изменений ... */

function isWordKnown(word) {
    return spellers.some(sp => sp.correct(word));
}

function collectSuggestions(word) {
    const seen = new Set();
    const result = [];
    for (const sp of spellers) {
        const suggestions = sp.suggest(word) || [];
        for (const s of suggestions) {
            if (!seen.has(s)) { seen.add(s); result.push(s); }
        }
    }
    return result;
}

function getCorrectionVariants(query) {
    const words = query.split(/[\s,.!?;:]+/).filter(w => w.length > 0);
    return words.map(word => {
        if (isWordKnown(word)) return [word];
        const suggestions = collectSuggestions(word);
        const variants = suggestions.length > 0 ? suggestions.slice(0, 3) : [word];
        if (!variants.includes(word)) variants.unshift(word);
        return variants;
    });
}

module.exports = { initSpellChecker, getCorrectionVariants };