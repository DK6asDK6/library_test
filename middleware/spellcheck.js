/*
 * Spell checking system file
 * IMPORTS:
 *  - spell-checker-js
 * EXPORTS:
 *  - initSpellChecker - spellchecker initialization function
 *  - getCorrectionVariants - main text spellcheck function
 */

const spell = require('spell-checker-js')

let isInitialized = false;

/*
 * Spell checker initialization function
 * PARAMETERS: None.
 * RETURNS: None.
 */
function initSpellChecker() {
    if (isInitialized) return;

    try{
        // Other languages can be loaded if needed
        spell.load('en')
        spell.check('ru');
        isInitialized = true;

        console.log('Dictionaries loaded (en, ru)')
    } catch (err) {
        console.log('Error loading dictionaries', err);
        throw err;
    }
}
/*
 * End of 'initSpellChecker' function
 */

/*
 * Get corrections for each word in query function
 * PARAMETERS:
 *  - query - words' array to be corrected
 * RETURNS:
 *  - variants - array of correction for each word
 */
function getCorrectionVariants(query) {
    const words = query.split(/[\s,.!?;:]+/).filter(w => w.length > 0);
    return words.map(word => {
        if (spell.check(word).length === 0) {
            return [word];
        }
        const suggestions = spell.suggest(word);
        const variants = suggestions.length > 0 ? suggestions.slice(0, 3) : [word];
        if (!variants.includes(word)) {
            variants.unshift(word);
        }
        return variants;
    });
}
/*
 * End of 'getCorrectionVariants' function
 */

module.exports = {initSpellChecker, getCorrectionVariants};

/*
 * END OF 'spellcheck.js' FILE
 */