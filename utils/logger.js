// Простой логгер с префиксами по модулю
function createLogger(moduleName) {
    const tag = `[${moduleName}]`;

    return {
        info:  (...args) => console.log(tag, ...args),
        warn:  (...args) => console.warn(tag, ...args),
        error: (...args) => console.error(tag, ...args),
        debug: (...args) => {
            if (process.env.DEBUG === 'true') console.log(tag, '🐛', ...args);
        },
    };
}

module.exports = { createLogger };