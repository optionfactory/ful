

/**
 * @typedef {{ type: string; context: string?; reason: string; details: any?; }} Problem
 */
class Failure extends Error {
    /**
     * 
     * @param {string} message 
     * @param {Problem[]} problems 
     * @param {*} cause
     */
    constructor(message, problems, cause) {
        super(message, { cause });
        this.name = 'Failure';
        this.problems = problems;
    }
}

export { Failure };