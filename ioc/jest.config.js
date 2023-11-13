// changed to this in order to be able to debug units
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	moduleFileExtensions: ['ts', 'js', 'json', 'node'],
	testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|js)$',
	verbose: true,
	testTimeout: 10000,
	testPathIgnorePatterns: ['.d.ts', '.js'],
	collectCoverage: true,
	collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.d.ts'],
	setupFiles: ['<rootDir>/setup.jest.ts'],
};
