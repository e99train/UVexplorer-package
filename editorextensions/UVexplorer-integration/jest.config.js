module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/control-panel/'],
    testRegex: '/test/.*\\.test\\.ts$',
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'test/tsconfig.json'
            }
        ]
    },
    moduleDirectories: ['node_modules', '<rootDir>'],
    moduleNameMapper: {
        '@uvx/(.*)': '<rootDir>/src/uvx/$1',
        '@actions/(.*)': '<rootDir>/src/actions/$1',
        'model/(.*)': '<rootDir>/model/$1',
        '@blocks/(.*)': '<rootDir>/src/blocks/$1'
    }
};
